import { Alert, Box, Button, Flex, Heading, HStack, Input, Table, Text, useDisclosure, Field } from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";

import { IngresoOCM_DTA, OrdenCompra } from "../types";
import { CardIngresoMaterial } from "./componentes/CardIngresoMaterial";
import { ListaMaterialesIngresoDesgloce } from "./StepTwoComponent_IngOCM/ListaMaterialesIngresoDesgloce";
import { ListaTransaccionesAlmacen } from "./StepTwoComponent_IngOCM/ListaTransaccionesAlmacen";
import { CerrarOrdenDialog } from "./StepTwoComponent_IngOCM/CerrarOrdenDialog";
import {
    buildIngresoOcmDta,
    buildOcmLotePreviewCandidates,
    getCantidadYaRecibida,
    getMaxCantidadPermitida,
    validateIngresoOcmDraft,
} from "./ingresoOcmMappers";
import { useIngresoOcmDraft } from "./useIngresoOcmDraft";
import { useOcmLotePreview } from "./useOcmLotePreview";
import { useOcmReceptionData } from "./useOcmReceptionData";
import { LIMITE_PROVEEDOR_RECEPCIONES_OCM_DEFAULT } from "../../../context/masterDirectiveConstants";

interface StepOneComponentProps {
    setActiveStep: (step: number) => void;
    orden: OrdenCompra | null;
    setIngresoOCM_DTA: Dispatch<SetStateAction<IngresoOCM_DTA | null>>;
}

function generateToken() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function IngresoOCMStep1VerifyQuantities({
    setActiveStep,
    orden,
    setIngresoOCM_DTA,
}: StepOneComponentProps) {
    const toast = useAppToast();
    const { open: isDialogOpen, onOpen: onDialogOpen, onClose: onDialogClose } = useDisclosure();
    const [token, setToken] = useState("");
    const [inputToken, setInputToken] = useState("");

    const {
        draftItems,
        maxLotesPorMaterial,
        changeLote,
        addLote,
        removeLote,
        toggleExcluded,
    } = useIngresoOcmDraft(orden);

    const {
        transacciones,
        loadingTransacciones,
        transaccionesError,
        consolidado,
        loadingConsolidado,
        consolidadoError,
        recibidoPorProducto,
    } = useOcmReceptionData(orden?.ordenCompraId);

    useEffect(() => {
        if (!orden?.ordenCompraId) {
            setToken("");
            setInputToken("");
            return;
        }

        setToken(generateToken());
        setInputToken("");
    }, [orden?.ordenCompraId]);

    const limiteRecepcionesParciales = useMemo(() => {
        const limiteBackend = orden?.limiteRecepcionesParcialesEfectivo;
        if (typeof limiteBackend === "number" && Number.isInteger(limiteBackend) && limiteBackend >= 1) {
            return limiteBackend;
        }

        const limiteProveedor = orden?.proveedor?.limiteRecepcionesParcialesOcm;
        if (typeof limiteProveedor === "number" && Number.isInteger(limiteProveedor) && limiteProveedor >= 1) {
            return limiteProveedor;
        }

        return LIMITE_PROVEEDOR_RECEPCIONES_OCM_DEFAULT;
    }, [
        orden?.limiteRecepcionesParcialesEfectivo,
        orden?.proveedor?.limiteRecepcionesParcialesOcm,
    ]);

    const limiteRecepcionesAlcanzado = transacciones.length >= limiteRecepcionesParciales;
    const previewCandidates = useMemo(
        () => buildOcmLotePreviewCandidates(draftItems),
        [draftItems]
    );
    const lotePreview = useOcmLotePreview(orden?.ordenCompraId, previewCandidates);
    const validation = useMemo(
        () => validateIngresoOcmDraft(
            orden,
            draftItems,
            recibidoPorProducto,
            limiteRecepcionesAlcanzado
        ),
        [draftItems, limiteRecepcionesAlcanzado, orden, recibidoPorProducto]
    );

    const onClickContinuar = () => {
        if (!validation.isValid) {
            toast({
                title: "Datos incompletos",
                description: "Debe recibir al menos un material con lotes validos. Los materiales excluidos no se recibiran en esta transaccion.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (inputToken !== token) {
            toast({
                title: "Token incorrecto",
                description: "El token ingresado no coincide.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (!orden) {
            return;
        }

        setIngresoOCM_DTA(buildIngresoOcmDta(orden, draftItems, lotePreview.previewsByLineKey));
        setActiveStep(2);
    };

    if (!orden) {
        return <Text>No se ha seleccionado ninguna orden.</Text>;
    }

    const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString() : "";
    const proveedorNombre = orden.proveedor?.nombre?.trim();
    const proveedorId = orden.proveedor?.id?.trim();
    const proveedorInconsistente = !orden.proveedor || !proveedorNombre;
    const proveedorLabel = proveedorNombre || "Proveedor no disponible";

    return (
        <Box p="1em" bg="app.stepperBlue">
            <Flex direction="column" gap={4} align="center">
                <Heading fontFamily="Comfortaa Variable">
                    Verificar Cantidades y Lotes
                </Heading>

                {proveedorInconsistente && (
                    <Alert.Root status="warning" borderRadius="md" w="full" maxW="4xl">
                        <Alert.Indicator />
                        <Box>
                            <Alert.Title>Proveedor no disponible en la respuesta</Alert.Title>
                            <Alert.Description>
                                La OCM deberia tener proveedor asociado. El ingreso puede seguir visible,
                                pero conviene revisar la relacion proveedor de esta orden en backend.
                            </Alert.Description>
                        </Box>
                    </Alert.Root>
                )}

                <Flex direction="column" align="center" gap={2}>
                    <Text fontFamily="Comfortaa Variable">
                        <strong>Proveedor:</strong> {proveedorLabel}
                        {proveedorId ? ` (NIT: ${proveedorId})` : ""}
                    </Text>
                    <Text fontFamily="Comfortaa Variable">
                        <strong>Fecha Emision:</strong> {formatDate(orden.fechaEmision)}
                    </Text>
                    <Text fontFamily="Comfortaa Variable">
                        <strong>Fecha Vencimiento:</strong> {formatDate(orden.fechaVencimiento)}
                    </Text>
                </Flex>

                {limiteRecepcionesAlcanzado && (
                    <Alert.Root
                        status="error"
                        variant='subtle'
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        textAlign="center"
                        borderRadius="md"
                        boxShadow="lg"
                        p={6}
                        w="full"
                        borderStartWidth='3px'
                        borderStartColor='colorPalette.solid'>
                        <Alert.Indicator boxSize="40px" mr={0} mb={2} />
                        <Alert.Title mt={2} mb={2} fontSize="lg" fontWeight="bold">
                            Limite de recepciones alcanzado
                        </Alert.Title>
                        <Alert.Description fontSize="md">
                            Esta orden de compra ya tiene {transacciones.length} recepciones registradas.
                            El limite efectivo para esta OCM es de {limiteRecepcionesParciales} recepciones parciales.
                            Puede cerrar la orden si ya se recibieron todos los materiales necesarios.
                        </Alert.Description>
                    </Alert.Root>
                )}

                {!limiteRecepcionesAlcanzado && (
                    <Text fontFamily="Comfortaa Variable" textAlign="center">
                        Para cada material, ingrese la informacion de los lotes recibidos o marquelo como excluido si no sera recibido en esta transaccion.
                        Puede agregar hasta 3 lotes por material. La suma de las cantidades no debe exceder la cantidad restante por recibir.
                    </Text>
                )}

                {(validation.excludedItemsCount > 0 || validation.receivedItemsCount < orden.itemsOrdenCompra.length) && (
                    <Box p={3} bg="yellow.50" borderRadius="md" borderWidth="1px" borderColor="yellow.200">
                        <Text fontFamily="Comfortaa Variable" fontSize="sm">
                            <strong>Recepcion Parcial:</strong> {validation.receivedItemsCount} de {orden.itemsOrdenCompra.length} materiales seran recibidos.
                            {validation.excludedItemsCount > 0 && ` ${validation.excludedItemsCount} material(es) excluido(s).`}
                        </Text>
                    </Box>
                )}

                {lotePreview.error && (
                    <Alert.Root status="warning" borderRadius="md" w="full">
                        <Alert.Indicator />
                        <Alert.Description>
                            No fue posible previsualizar los lotes internos en este momento. El backend confirmara el lote definitivo al registrar.
                        </Alert.Description>
                    </Alert.Root>
                )}

                <Box w="full" bg="app.surface" borderRadius="md" boxShadow="sm" overflowX="auto">
                    <Table.Root size="sm" variant="line">
                        <Table.Header bg="app.tableHeader">
                            <Table.Row>
                                <Table.ColumnHeader>Material</Table.ColumnHeader>
                                <Table.ColumnHeader>ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Cantidad Ordenada</Table.ColumnHeader>
                                <Table.ColumnHeader>Cantidad Ingresada</Table.ColumnHeader>
                                <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="center">Acciones</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {draftItems.map(draftItem => {
                                const cantidadYaRecibida = getCantidadYaRecibida(
                                    draftItem.item,
                                    recibidoPorProducto
                                );
                                const maxPermitido = getMaxCantidadPermitida(
                                    draftItem.item,
                                    recibidoPorProducto
                                );

                                return (
                                    <CardIngresoMaterial
                                        key={draftItem.itemIndex}
                                        draftItem={draftItem}
                                        previewByLineKey={lotePreview.previewsByLineKey}
                                        isPreviewLoading={lotePreview.loading}
                                        cantidadYaRecibida={cantidadYaRecibida}
                                        maxPermitido={maxPermitido}
                                        maxLotesPorMaterial={maxLotesPorMaterial}
                                        onChangeLote={changeLote}
                                        onAddLote={addLote}
                                        onRemoveLote={removeLote}
                                        onToggleExcluded={toggleExcluded}
                                    />
                                );
                            })}
                        </Table.Body>
                    </Table.Root>
                </Box>

                <ListaTransaccionesAlmacen
                    ordenCompraId={orden.ordenCompraId}
                    transacciones={transacciones}
                    loading={loadingTransacciones}
                    error={transaccionesError}
                />

                <ListaMaterialesIngresoDesgloce
                    ordenCompraId={orden.ordenCompraId}
                    consolidado={consolidado}
                    loading={loadingConsolidado}
                    error={consolidadoError}
                />

                <Field.Root w="40%" required>
                    <Field.Label>Token de verificacion</Field.Label>
                    <Input
                        placeholder="Ingrese el token"
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                    />
                </Field.Root>

                <Text fontFamily="Comfortaa Variable">
                    Token: <strong>{token}</strong>
                </Text>

                <Flex w="40%">
                    <HStack gap={4} w="full">
                        {!limiteRecepcionesAlcanzado && (
                            <Button
                                colorPalette="teal"
                                flex="1"
                                disabled={!validation.isValid || lotePreview.loading}
                                loading={lotePreview.loading}
                                loadingText="Calculando lotes..."
                                onClick={onClickContinuar}
                            >
                                Continuar
                            </Button>
                        )}
                        {transacciones.length > 0 && (
                            <Button
                                colorPalette="red"
                                variant="outline"
                                onClick={onDialogOpen}
                                disabled={loadingTransacciones}
                            >
                                Cerrar Orden
                            </Button>
                        )}
                    </HStack>
                </Flex>
            </Flex>

            <CerrarOrdenDialog
                isOpen={isDialogOpen}
                onClose={onDialogClose}
                orden={orden}
                setActiveStep={setActiveStep}
            />
        </Box>
    );
}
