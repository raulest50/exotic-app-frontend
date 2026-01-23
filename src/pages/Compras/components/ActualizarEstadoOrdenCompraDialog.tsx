// src/components/ActualizarEstadoOrdenCompraDialog.tsx
import React, { useEffect, useState } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Button,
    Box,
    Text,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Input,
    useToast,
    HStack, VStack, FormControl, FormLabel, Flex, Select
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL';
import { OrdenCompraMateriales, getEstadoText, getCondicionPagoText, getCantidadCorrectaText, TipoEnvio } from '../types';
import OCM_PDF_Generator from "../OCM_PDF_Generator.tsx";

interface ActualizarEstadoOrdenCompraDialogProps {
    isOpen: boolean;
    onClose: () => void;
    orden: OrdenCompraMateriales;
    onEstadoUpdated?: (updatedOrden: OrdenCompraMateriales) => void;
}

const ActualizarEstadoOrdenCompraDialog: React.FC<ActualizarEstadoOrdenCompraDialogProps> = ({
                                                                                                 isOpen,
                                                                                                 onClose,
                                                                                                 orden,
                                                                                                 onEstadoUpdated
                                                                                             }) => {
    const toast = useToast();

    // Generate a random 7-digit code and hold the user input.
    const [randomCode, setRandomCode] = useState<string>('');
    const [inputCode, setInputCode] = useState<string>('');
    const [isLoadingEnvio, setIsLoadingEnvio] = useState<boolean>(false);

    const [tipoEnvio, setTipoEnvio] = useState<string>(TipoEnvio.EMAIL);

    // For estados 1 and 2, keep a local copy of the items (to update precioCorrecto or check cantidadCorrecta).
    const [localItems, setLocalItems] = useState(orden.itemsOrdenCompra);

    // Check if the provider has an email in their contacts
    const hasEmail = () => {
        if (!orden.proveedor || !orden.proveedor.contactos) return false;
        return orden.proveedor.contactos.some(contacto => contacto.email && contacto.email.trim() !== '');
    };

    // Check if the provider has a phone number in their contacts
    const hasPhoneNumber = () => {
        if (!orden.proveedor || !orden.proveedor.contactos) return false;
        return orden.proveedor.contactos.some(contacto => contacto.cel && contacto.cel.trim() !== '');
    };

    /**
     * Cada item de la orden de compra debe tener cantidadCorrecta = 1 para que se considere
     * recibida en bodega y se pueda proceder al cierre de la orden.
     */
    const [cantidadesFisicasOk, setCantidadesFisicasOk] = useState(false);

    const checkVerificacionFisica = () => {
        let cantidadIsOk = true;
        for (let i = 0; i < localItems.length; i++) {
            if (localItems[i].cantidadCorrecta !== 1) cantidadIsOk = false;
        }
        setCantidadesFisicasOk(cantidadIsOk);
    };

    // Generate a random code and reset inputs when the modal opens.
    useEffect(() => {
        checkVerificacionFisica();
        if (isOpen) {
            const code = Math.floor(1000 + Math.random() * 9000).toString();
            setRandomCode(code);
            setInputCode('');

            // Reset tipoEnvio to default based on available options
            if (hasEmail()) {
                setTipoEnvio(TipoEnvio.EMAIL);
            } else if (hasPhoneNumber()) {
                setTipoEnvio(TipoEnvio.WHATSAPP);
            } else {
                setTipoEnvio(TipoEnvio.MANUAL);
            }

            // Clone the items array for local updates.
            setLocalItems(orden.itemsOrdenCompra);
        }
    }, [isOpen, orden.itemsOrdenCompra]);

    /*interface EstadoUpdate{
        newEstado: number;
        OCMpdf?: Blob;
    }*/

    // Function to update order estado via backend.
    // When newEstado === 1 and a facturaId is provided, include it in the request.
    const updateEstado = async (newEstado: number) => {
        try {
            // const requestBody:EstadoUpdate = { newEstado: newEstado };
            const formData = new FormData();

            // Include tipoEnvio in the request when updating to estado 2
            const requestData = newEstado === 2 
                ? { newEstado, tipoEnvio } 
                : { newEstado };

            formData.append(
                'request',
                new Blob([JSON.stringify(requestData)], { type: 'application/json' }),
                'request'
            );

            let OCMpdf: Blob|null = null;
            if(newEstado === 2){ // se adjunta OCM en pdf format para enviar como adjunto a proveedor
                const generator = new OCM_PDF_Generator();
                OCMpdf = await generator.getOCMpdf_Blob(orden);
                formData.append(
                    'OCMpdf',
                    OCMpdf,
                    `orden-compra-${orden.ordenCompraId}.pdf`
                );
            }

            const response = await axios.put(
                `${EndPointsURL.getDomain()}/compras/orden_compra/${orden.ordenCompraId}/updateEstado`,
                formData
            );
            toast({
                title: "Estado actualizado",
                description: "La orden ha sido actualizada exitosamente.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
            if (onEstadoUpdated) onEstadoUpdated(response.data);
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo actualizar el estado de la orden.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
        onClose();
    };

    // Handler for confirmar proveedor (estado transition from 0 to 1).
    // It passes the facturaCompra id along with the confirmation token.
    const handleLiberacion = () => {
        if (inputCode === randomCode) {
            updateEstado(1);
        } else {
            toast({
                title: "Código incorrecto",
                description: "La operación no se ejecutó, el número aleatorio no coincide.",
                status: "warning",
                duration: 5000,
                isClosable: true,
            });
            onClose();
        }
    };

    // Handler for confirming precios (estado 1 -> 2).
    const handleEnviarProveedor = async () => {
        if (inputCode === randomCode) {
            setIsLoadingEnvio(true);
            try {
                await updateEstado(2);
            } finally {
                setIsLoadingEnvio(false);
            }
        } else {
            toast({
                title: "Código incorrecto",
                description: "La operación no se ejecutó, el número aleatorio no coincide.",
                status: "warning",
                duration: 5000,
                isClosable: true,
            });
            onClose();
        }
    };

    // Handler for closing the order (estado 2 -> 3).
    const handleCerrarOrden = () => {
        if (inputCode === randomCode) {
            updateEstado(3);
        } else {
            toast({
                title: "Código incorrecto",
                description: "La operación no se ejecutó, el número aleatorio no coincide.",
                status: "warning",
                duration: 5000,
                isClosable: true,
            });
            onClose();
        }
    };


    // For estado 2: Check that all items have cantidadCorrecta === 1.
    const allCantidadCorrecta = () => {
        return localItems?.every(item => item.cantidadCorrecta === 1);
    };


    function OrdenDetailsComponent(){
        return(
            <>
                <Box mb={4}>
                    <Text><strong>ID:</strong> {orden.ordenCompraId}</Text>
                    <Text><strong>Fecha Emisión:</strong> {orden.fechaEmision ? new Date(orden.fechaEmision).toLocaleString() : '-'}</Text>
                    <Text><strong>Fecha Vencimiento:</strong> {orden.fechaVencimiento ? new Date(orden.fechaVencimiento).toLocaleDateString() : '-'}</Text>
                    <Text><strong>Id Factura Correspondiente:</strong> {orden.facturaCompraId ? orden.facturaCompraId : 'Pendiente por relacionar'}</Text>
                    <Text><strong>Proveedor:</strong> {orden.proveedor ? orden.proveedor.nombre : '-'}</Text>
                    <Text><strong>Total a Pagar:</strong> {orden.totalPagar}</Text>
                    <Text><strong>Estado:</strong> {getEstadoText(orden.estado)}</Text>
                    <Text><strong>Condición de Pago:</strong> {getCondicionPagoText(orden.condicionPago)}</Text>
                    <Text><strong>Tiempo de Entrega:</strong> {orden.tiempoEntrega}</Text>
                    <Text><strong>Plazo de Pago:</strong> {orden.plazoPago}</Text>
                </Box>
            </>
        )
    }

    // Component to render the order details and items table.
    function OrdenCompraItemListComponent() {
        return (
            <>
                {orden.itemsOrdenCompra && orden.itemsOrdenCompra.length > 0 && (
                    <Box>
                        <Text fontWeight="bold" mb={2}>Items de la Orden</Text>
                        <Table variant="simple" size="sm">
                            <Thead>
                                <Tr>
                                    <Th>ID</Th>
                                    <Th>Materia Prima</Th>
                                    <Th>Cantidad</Th>
                                    <Th>Precio Unitario</Th>
                                    <Th>IVA</Th>
                                    <Th>Subtotal</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {localItems && localItems.map((item) => (
                                    <Tr key={item.itemOrdenId}>
                                        <Td>{item.itemOrdenId}</Td>
                                        <Td>{item.material ? `${item.material.productoId} - ${item.material.nombre} - (${item.material.tipoUnidades}) ` : '-'}</Td>
                                        <Td >{item.cantidad}</Td>
                                        <Td >{item.precioUnitario}</Td>
                                        <Td >{item.ivaCOP}</Td>
                                        <Td >{item.subTotal}</Td>
                                        <Td hidden={orden.estado!=2}>{getCantidadCorrectaText(item.cantidadCorrecta)}</Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </Box>
                )}
            </>
        );
    }

    // Render different content based on the current estado.
    const renderContent = () => {
        if (orden.estado === -1) {
            return (
                <Box textAlign="center" py={4}>
                    <Text>Esta Orden ya ha sido cancelada y no se puede alterar más su estado.</Text>
                    <Button mt={4} colorScheme="blue" onClick={onClose}>Cerrar</Button>
                </Box>
            );
        }
        if (orden.estado === 3) {
            return (
                <Box textAlign="center" py={4}>
                    <Text>Esta Orden de compra fue cerrada exitosamente y ya no se puede cambiar su estado.</Text>
                    <Button mt={4} colorScheme="blue" onClick={onClose}>Cerrar</Button>
                </Box>
            );
        }
        if (orden.estado === 0) {
            // Estado 0: show full order details plus an extra input for FacturaCompra id and token confirmation.
            return (
                <>
                    <OrdenDetailsComponent />
                    <OrdenCompraItemListComponent/>

                    <Box mt={4} textAlign="center" p="1em" >
                        <HStack justifyContent={"center"} alignItems="flex-start" mt={2} >
                            <VStack alignItems="center" mt={2} >
                                <Text fontWeight="bold">Token dinámico de confirmación: {randomCode}</Text>
                                <FormControl isRequired>
                                    <FormLabel>Token Dinamico de Confirmacion:</FormLabel>
                                    <Input
                                        placeholder="Digite token dinámico"
                                        value={inputCode}
                                        onChange={(e) => setInputCode(e.target.value)}
                                        maxW="200px"
                                    />
                                </FormControl>
                                <Button colorScheme="green" onClick={handleLiberacion}>
                                    Liberar Orden
                                </Button>
                            </VStack>
                        </HStack>
                    </Box>
                </>
            );
        }
        if (orden.estado === 1) {
            // Estado 1: show order details with token confirmation for precios.
            return (
                <>
                    <OrdenDetailsComponent />
                    <OrdenCompraItemListComponent/>
                    <Box mt={4} textAlign="center">
                        <Text fontWeight="bold">Código: {randomCode}</Text>
                        <Flex p="1em" direction={"row"} gap={10} alignItems={"center"} justifyContent={"space-between"}>
                            <Box flex={1}>
                                <FormControl>
                                    <FormLabel>Tipo Envio Orden Compra</FormLabel>
                                    <Select
                                        value={tipoEnvio}
                                        onChange={(e) => setTipoEnvio(e.target.value)}
                                    >
                                        <option value={TipoEnvio.MANUAL}>{TipoEnvio.MANUAL}</option>
                                        {hasEmail() && (
                                            <option value={TipoEnvio.EMAIL}>CORREO ELECTRÓNICO</option>
                                        )}
                                        {hasPhoneNumber() && (
                                            <option value={TipoEnvio.WHATSAPP}>WHATSAPP</option>
                                        )}
                                    </Select>
                                </FormControl>
                            </Box>
                            <Box display={"flex"} gap={5} flex={2} >
                                <Input
                                placeholder="Digite el código"
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value)}
                                maxW="200px"
                                />
                                <Button
                                    colorScheme="green"
                                    onClick={handleEnviarProveedor}
                                    isLoading={isLoadingEnvio}
                                    loadingText="Enviando..."
                                >
                                    Enviar a Proveedor
                                </Button>
                            </Box>
                        </Flex>
                    </Box>
                </>
            );
        }
        if (orden.estado === 2) {
            // Estado 2: show simplified order details (info and a table with only cantidadCorrecta) and token confirmation for cerrar la orden.
            return (
                <>
                    <OrdenDetailsComponent />
                    <OrdenCompraItemListComponent/>

                    <Box mt={4} textAlign="center">
                        <Text fontWeight="bold" hidden={cantidadesFisicasOk}>En espera del reporte de almacén</Text>
                        <Text fontWeight="bold" hidden={!cantidadesFisicasOk}>Token dinámico de confirmación: {randomCode}</Text>
                        <HStack hidden={!cantidadesFisicasOk}>
                            <Input
                                placeholder="Digite token dinámico"
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value)}
                                maxW="200px"
                            />
                            <Button
                                colorScheme="green"
                                onClick={handleCerrarOrden}
                                isDisabled={!allCantidadCorrecta()}
                            >
                                Cerrar Orden De Compra Exitosamente
                            </Button>
                        </HStack>
                    </Box>
                </>
            );
        }
        return null;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size={["auto", "4xl"]} scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Actualizar Estado de la Orden de Compra</ModalHeader>
                <ModalCloseButton />
                <ModalBody>{renderContent()}</ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" onClick={onClose}>Cerrar</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ActualizarEstadoOrdenCompraDialog;
