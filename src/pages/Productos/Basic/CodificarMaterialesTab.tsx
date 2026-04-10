import { useState, useRef } from 'react';
import {
    VStack,
    SimpleGrid,
    GridItem,
    FormControl,
    FormLabel,
    FormHelperText,
    Input,
    Textarea,
    Button,
    useToast,
    Select,
    Flex,
    HStack,
    IconButton,
    Switch
} from '@chakra-ui/react';
import axios, { AxiosError } from 'axios';

import { input_style } from "../../../styles/styles_general.tsx";
import {Material, UNIDADES, TIPOS_PRODUCTOS, TIPOS_MATERIALES} from "../types.tsx";
import { normalizeProductId, validateProductId } from "../productIdUtils.ts";

import { FaFileUpload } from "react-icons/fa";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import {IVA_VALUES} from "../types.tsx"

function CodificarMaterialesTab() {
    const [nombre, setNombre] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [tipo_unidad, setTipo_unidad] = useState(UNIDADES.KG);
    const [cantidad_unidad, setCantidad_unidad] = useState('');
    const [codigo, setCodigo] = useState('');
    const [url_ftecnica, setUrl_ftecnica] = useState('');
    const [tipoMaterial, setTipoMaterial] = useState(TIPOS_MATERIALES.materiaPrima);
    const [inventareable, setInventareable] = useState(true);
    const [puntoReordenStr, setPuntoReordenStr] = useState('-1');

    const [ivaPercentage, setIvaPercentage] = useState(0);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const toast = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const clearMP_Cod_Fields = () => {
        setNombre('');
        setObservaciones('');
        setCantidad_unidad('');
        setCodigo('');
        setUrl_ftecnica('');
        setSelectedFile(null);
        setIvaPercentage(0);
        setTipoMaterial(TIPOS_MATERIALES.materiaPrima);
        setTipo_unidad(UNIDADES.KG);
        setInventareable(true);
        setPuntoReordenStr('-1');
    };

    // Validate data: all fields must be non-empty, codigo numeric, cantidad positive, and a PDF file must be loaded.
    const validateData = (): boolean => {
        if (!nombre.trim()) {
            toast({
                title: "Validation Error",
                description: "El campo 'Nombre' es requerido.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }

        const productIdError = validateProductId(codigo);
        if (productIdError) {
            const descriptionByError: Record<typeof productIdError, string> = {
                required: "El 'Codigo' no puede estar vacio.",
                alphanumeric: "El 'Codigo' solo puede contener letras y numeros, sin espacios ni caracteres especiales.",
                uppercase: "El 'Codigo' debe usar letras mayusculas.",
            };

            toast({
                title: "Validation Error",
                description: descriptionByError[productIdError],
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }

        const cantidad = Number(cantidad_unidad);
        if (!cantidad_unidad.trim() || isNaN(cantidad) || cantidad <= 0) {
            toast({
                title: "Validation Error",
                description: "La 'Cantidad por Unidad' debe ser un numero positivo.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }
        /* Comentado para hacer el campo observaciones opcional
        if (!observaciones.trim()) {
            toast({
                title: "Validation Error",
                description: "El campo 'Observaciones' es requerido.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }
        */
        // Ficha tecnica is now optional, so we only validate the file type if a file is selected
        // Check file type if a file is selected
        if (selectedFile && selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
            toast({
                title: "Validation Error",
                description: "El archivo seleccionado debe ser un PDF.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }
        const pr = Number(puntoReordenStr);
        if (puntoReordenStr.trim() === '' || !Number.isFinite(pr) || (pr !== -1 && pr < 0)) {
            toast({
                title: "Validation Error",
                description: "Punto de reorden: -1 (sin alertas), 0 (sin umbral definido) o un numero mayor o igual a 0.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return false;
        }
        return true;
    };

    // Trigger hidden file input when clicking the upload button.
    const onClickUploadFicha = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Handler for file selection.
    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                toast({
                    title: "File Error",
                    description: "El archivo debe ser un PDF.",
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                });
                setSelectedFile(null);
                setUrl_ftecnica('');
            } else {
                setSelectedFile(file);
                // You may set the file name as a placeholder.
                setUrl_ftecnica(file.name);
                toast({
                    title: "Archivo cargado",
                    description: "El archivo PDF se cargo correctamente.",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
            }
        }
    };

    // Function to save MateriaPrima and its technical sheet to the backend.
    const saveMateriaPrimSubmit = async () => {
        if (!validateData()) return;

        const puntoReorden = Number(puntoReordenStr);
        const normalizedCodigo = normalizeProductId(codigo);
        const materiaPrima: Material = {
            productoId: normalizedCodigo,
            nombre,
            observaciones,
            costo: 0,
            tipoUnidades: tipo_unidad,
            cantidadUnidad: cantidad_unidad,
            tipo_producto: TIPOS_PRODUCTOS.materiaPrima,
            tipoMaterial: tipoMaterial,
            inventareable,
            ivaPercentual: ivaPercentage,
            puntoReorden,
        };

        // Log the payload being sent to the backend
        console.log('Payload enviado al backend para material:', JSON.stringify(materiaPrima, null, 2));

        // Create a FormData object and append the materiaPrima as a Blob with correct MIME type.
        const formData = new FormData();
        formData.append(
            "materiaPrima",
            new Blob([JSON.stringify(materiaPrima)], { type: "application/json" })
        );
        // Only append the file if one is selected (ficha tecnica is optional)
        if (selectedFile) {
            formData.append("file", selectedFile);
        }

        try {
            const endPoints = new EndPointsURL();
            const url = endPoints.save_mprima_v2; // Full URL for the endpoint
            await axios.post(url, formData);
            toast({
                title: "Exito",
                description: "La Materia Prima se ha guardado correctamente.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            clearMP_Cod_Fields();
        } catch (e) {
            const error = e as AxiosError;

            let errorMsg: string = "";

            if (error.response && error.response.data) {
                // Assume the error response data is either a string or an object with an optional "message" property.
                const data = error.response.data as { message?: string } | string;
                if (typeof data === "string") {
                    errorMsg = data;
                } else if (typeof data === "object") {
                    errorMsg = data.message ?? JSON.stringify(data);
                }
            } else {
                errorMsg = error.message;
            }

            // Now use errorMsg, for example by showing a toast:
            toast({
                title: "Error al guardar",
                description: errorMsg,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    return (
        <>
            <VStack w="full" h="full" spacing={4}>
                <SimpleGrid w="full" h="full" columns={3} gap="2em">
                    <GridItem colSpan={1}>
                        <FormControl isRequired>
                            <FormLabel>Codigo</FormLabel>
                            <Input
                                value={codigo}
                                onChange={(e) => setCodigo(normalizeProductId(e.target.value))}
                                sx={input_style}
                            />
                        </FormControl>
                    </GridItem>

                    <GridItem colSpan={2}>
                        <FormControl isRequired>
                            <FormLabel>Nombre</FormLabel>
                            <Input
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                sx={input_style}
                            />
                        </FormControl>
                    </GridItem>

                    <GridItem colSpan={2}>
                        <HStack gap={10}>
                            <IconButton
                                aria-label="subir pdf"
                                icon={<FaFileUpload />}
                                fontSize="3em"
                                w="2em"
                                h="2em"
                                colorScheme="green"
                                onClick={onClickUploadFicha}
                            />
                            <FormControl>
                                <FormLabel>Url Ficha Tecnica (Opcional)</FormLabel>
                                <Input
                                    readOnly
                                    value={url_ftecnica}
                                    sx={input_style}
                                />
                            </FormControl>
                        </HStack>
                    </GridItem>

                    <GridItem colSpan={1}>
                        <Flex w="full" direction="row" align="flex-end" justify="space-around" gap={4}>
                            <Select
                                flex="1"
                                value={tipo_unidad}
                                onChange={(e) => setTipo_unidad(e.target.value)}
                            >
                                <option value={UNIDADES.KG}>{UNIDADES.KG}</option>
                                <option value={UNIDADES.L}>{UNIDADES.L}</option>
                                <option value={UNIDADES.U}>{UNIDADES.U}</option>
                                <option value={UNIDADES.G}>{UNIDADES.G}</option>
                            </Select>
                            <FormControl flex="4" isRequired>
                                <FormLabel>Cantidad por Unidad</FormLabel>
                                <Input
                                    value={cantidad_unidad}
                                    onChange={(e) => setCantidad_unidad(e.target.value)}
                                    variant="filled"
                                />
                            </FormControl>
                        </Flex>
                    </GridItem>

                    <GridItem colSpan={1}>
                        <Flex w="full" direction="row" align="flex-end" justify="space-around" gap={4}>
                            <FormControl>
                                <FormLabel>Tipo:</FormLabel>
                                <Select
                                    flex="1"
                                    value={tipoMaterial}
                                    onChange={(e) => setTipoMaterial(Number(e.target.value))}
                                >
                                    <option value={TIPOS_MATERIALES.materiaPrima}>Materia Prima</option>
                                    <option value={TIPOS_MATERIALES.materialDeEmpaque}>Material Empaque</option>
                                </Select>
                            </FormControl>
                        </Flex>
                    </GridItem>

                    <GridItem colSpan={1}>
                        <Flex w="full" direction="row" align="flex-end" justify="space-around" gap={4}>
                            <FormControl>
                                <FormLabel>Iva (%):</FormLabel>
                                <Select
                                    flex="1"
                                    value={ivaPercentage}
                                    onChange={(e) => setIvaPercentage(Number(e.target.value))}
                                >
                                    <option value={IVA_VALUES.iva_0}> No tiene </option>
                                    <option value={IVA_VALUES.iva_5}> 5 %</option>
                                    <option value={IVA_VALUES.iva_19}> 19 %</option>

                                </Select>
                            </FormControl>
                        </Flex>
                    </GridItem>

                    <GridItem colSpan={1}>
                        <FormControl display="flex" alignItems="center">
                            <FormLabel mb="0">Inventareable</FormLabel>
                            <Switch isChecked={inventareable} onChange={(e) => setInventareable(e.target.checked)} />
                        </FormControl>
                    </GridItem>

                    <GridItem colSpan={1}>
                        <FormControl>
                            <FormLabel>Punto de reorden</FormLabel>
                            <Input
                                type="number"
                                step="any"
                                value={puntoReordenStr}
                                onChange={(e) => setPuntoReordenStr(e.target.value)}
                                sx={input_style}
                            />
                            <FormHelperText fontSize="xs">
                                -1 sin alertas; 0 sin umbral definido; mayor a 0 alerta si stock es menor o igual.
                            </FormHelperText>
                        </FormControl>
                    </GridItem>

                    <GridItem colSpan={3}>
                        <FormControl>
                            <FormLabel>Observaciones</FormLabel>
                            <Textarea
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                variant="filled"
                            />
                        </FormControl>
                    </GridItem>
                </SimpleGrid>
            </VStack>
            <Button m={5} colorScheme="teal" onClick={saveMateriaPrimSubmit}>
                Codificar Material
            </Button>
            <Button m={5} colorScheme="orange" onClick={clearMP_Cod_Fields}>
                Borrar Campos
            </Button>

            {/* Hidden file input for PDF upload */}
            <input
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={onFileChange}
            />
        </>
    );
}

export default CodificarMaterialesTab;
