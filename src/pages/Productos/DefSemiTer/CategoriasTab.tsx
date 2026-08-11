import {useState, useEffect} from 'react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import {
    Steps,
    Flex,
    Grid,
    Input,
    Button,
    VStack,
    Box,
    Heading,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Spinner,
    Alert,
    Text,
    Field,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";

import {Categoria} from '../types.tsx';
import CategoriaManufacturingTemplateDesigner from './Templates/CategoriaManufacturingTemplateDesigner.tsx';

export function CategoriasTab() {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [templatesExistentes, setTemplatesExistentes] = useState<Record<number, boolean>>({});
    const [selectedTemplateCategoria, setSelectedTemplateCategoria] = useState<Categoria | null>(null);

    const [formData, setFormData] = useState({
        categoriaId: '',
        categoriaNombre: '',
        categoriaDescripcion: ''
    });

    const [submitting, setSubmitting] = useState<boolean>(false);
    const toast = useAppToast();
    const endPoints = new EndPointsURL();

    const fetchTemplatesExistentes = async (categoriasActuales: Categoria[]) => {
        if (categoriasActuales.length === 0) {
            setTemplatesExistentes({});
            return;
        }
        try {
            const params = new URLSearchParams({
                categoriaIds: categoriasActuales.map((categoria) => String(categoria.categoriaId)).join(',')
            });
            const response = await axios.get<Record<number, boolean>>(
                `${endPoints.check_categoria_manufacturing_templates_exist_batch}?${params.toString()}`
            );
            setTemplatesExistentes(response.data ?? {});
        } catch (error) {
            console.error('Error fetching manufacturing template status:', error);
            setTemplatesExistentes({});
        }
    };

    const fetchCategorias = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(endPoints.get_categorias);
            setCategorias(response.data);
            await fetchTemplatesExistentes(response.data);
        } catch (error) {
            console.error('Error fetching categorias:', error);
            setError('Error al cargar las categorías. Por favor, intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategorias();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            const newCategoria = {
                categoriaId: Number(formData.categoriaId),
                categoriaNombre: formData.categoriaNombre,
                categoriaDescripcion: formData.categoriaDescripcion
            };

            await axios.post(endPoints.save_categoria, newCategoria);

            toast({
                title: 'Categoría creada',
                description: 'La categoría ha sido creada exitosamente',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            handleClear();
            fetchCategorias(); // Recargar la lista después de crear
        } catch (error) {
            console.error('Error creating categoria:', error);

            // Manejo mejorado de excepciones
            let errorMessage = 'No se pudo crear la categoría. Por favor, intente nuevamente.';

            // Extraer el mensaje de error específico del backend
            if (axios.isAxiosError(error) && error.response) {
                // Si el backend devuelve un mensaje de error en la respuesta
                if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response.data && typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                }
            }

            toast({
                title: 'Error',
                description: errorMessage,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleClear = () => {
        setFormData({
            categoriaId: '',
            categoriaNombre: '',
            categoriaDescripcion: ''
        });
    };

    const isFormValid = formData.categoriaNombre.trim() !== '' && formData.categoriaDescripcion.trim() !== '';

    if (selectedTemplateCategoria) {
        return (
            <CategoriaManufacturingTemplateDesigner
                categoria={selectedTemplateCategoria}
                onBack={() => setSelectedTemplateCategoria(null)}
                onSaved={() => fetchTemplatesExistentes(categorias)}
            />
        );
    }

    return (
        <Grid templateColumns="1fr 1fr" gap={6} p={4}>
            <Box p={6} borderWidth="1px" borderRadius="lg">
                <VStack gap={4} align="stretch">
                    <Heading size="md" mb={4}>Nueva Categoría</Heading>

                    <Field.Root required>
                        <Field.Label>Categoría ID</Field.Label>
                        <Input
                            name="categoriaId"
                            value={formData.categoriaId}
                            onValueChange={handleInputChange}
                            placeholder="Id de la categoría"
                            disabled={submitting}
                        />
                    </Field.Root>

                    <Field.Root required>
                        <Field.Label>Nombre</Field.Label>
                        <Input
                            name="categoriaNombre"
                            value={formData.categoriaNombre}
                            onValueChange={handleInputChange}
                            placeholder="Nombre de la categoría"
                            disabled={submitting}
                        />
                    </Field.Root>

                    <Field.Root required>
                        <Field.Label>Descripción</Field.Label>
                        <Input
                            name="categoriaDescripcion"
                            value={formData.categoriaDescripcion}
                            onValueChange={handleInputChange}
                            placeholder="Descripción de la categoría"
                            disabled={submitting}
                        />
                    </Field.Root>
                    <Flex justify="space-between" mt={4}>
                        <Button
                            colorPalette="blue"
                            onClick={handleSubmit}
                            disabled={!isFormValid || submitting}
                            loading={submitting}
                            loadingText="Guardando..."
                        >
                            Guardar
                        </Button>
                        <Button onClick={handleClear} disabled={submitting}>Limpiar</Button>
                    </Flex>
                </VStack>
            </Box>
            <Box p={6} borderWidth="1px" borderRadius="lg">
                <Heading size="md" mb={4}>Categorías Existentes</Heading>

                {loading && <Spinner size="md" />}

                {error && (
                    <Alert.Root status="error" mb={4}>
                        <Alert.Indicator />
                        <Text>{error}</Text>
                    </Alert.Root>
                )}

                {!loading && !error && categorias.length === 0 && (
                    <Alert.Root status="info" mb={4}>
                        <Alert.Indicator />
                        <Text>No hay categorías registradas. Cree una nueva categoría utilizando el formulario.</Text>
                    </Alert.Root>
                )}

                {!loading && !error && categorias.length > 0 && (
                    <Table.Root variant="simple">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                <Table.ColumnHeader>Descripción</Table.ColumnHeader>
                                <Table.ColumnHeader>Plantilla</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {categorias.map((categoria) => (
                                <Table.Row key={categoria.categoriaId}>
                                    <Table.Cell>{categoria.categoriaId}</Table.Cell>
                                    <Table.Cell>{categoria.categoriaNombre}</Table.Cell>
                                    <Table.Cell>{categoria.categoriaDescripcion}</Table.Cell>
                                    <Table.Cell>
                                        <Button
                                            size="sm"
                                            colorPalette={templatesExistentes[categoria.categoriaId] ? 'purple' : 'teal'}
                                            onClick={() => setSelectedTemplateCategoria(categoria)}
                                        >
                                            {templatesExistentes[categoria.categoriaId] ? 'Editar plantilla' : 'Crear plantilla'}
                                        </Button>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                )}
            </Box>
        </Grid>
    );
}
