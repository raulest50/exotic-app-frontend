import { useState, useEffect, useCallback } from 'react';
import { 
  Card, CardBody, CardHeader, Flex, IconButton, Text, Box, HStack, Heading, 
  FormControl, FormLabel, Input, Select, Divider, Grid, GridItem
} from '@chakra-ui/react';
import { AddIcon, MinusIcon } from '@chakra-ui/icons';
import { 
  ActivoFijo, 
  ItemOrdenCompraActivo, 
  TIPO_INCORPORACION, 
  TipoActivo, 
  UnidadesCapacidad,
  DIVISAS
} from "../../../types.tsx";
import { MetodoDepreciacionComponent } from "../MetodoDepreciacion/MetodoDepreciacion.tsx";

type Props = {
    itemOrdenCompraActivo?: ItemOrdenCompraActivo;
    setActivoFijoGroup: (activoFijoGroup: ActivoFijo[]) => void;
    tipoIncorporacion: string;
};

/**
 * cuando se hace una orden de compra de activos, es pósible que del mismo
 * activo se requiera varias unidades. sin embargo se debe registrar cada una
 * por separado a diferencia de como sucede con los materiales, ya que minimo
 * se debe establecer una identificacion, un lugar y un responsable para cada
 * activo a pesar que sea el mismo.
 * @param props
 * @constructor
 */
export function ActivoGroup({ itemOrdenCompraActivo, setActivoFijoGroup, tipoIncorporacion }: Props) {
    // Create a default item if none is provided
    const defaultItem: ItemOrdenCompraActivo = {
        nombre: "Nuevo Grupo",
        cantidad: 1,
        precioUnitario: 0,
        ivaPercentage: 0,
        ivaValue: 0,
        subTotal: 0
    };

    // Use the provided item or the default one
    const item = itemOrdenCompraActivo || defaultItem;

    const [listaActivos, setListaActivos] = useState<ActivoFijo[]>([]);

    // Atributos comunes para todo el grupo
    const [tipoActivo, setTipoActivo] = useState<TipoActivo>(TipoActivo.EQUIPO); // Por defecto es EQUIPO
    const [brand, setBrand] = useState<string>("");
    // NOTA: Inicializado con 1 en lugar de 0 para pasar la validación en ActivosFijosStep1Form.tsx
    // Esta es una solución temporal para evitar que el botón "Siguiente" se deshabilite cuando se selecciona "Activo de produccion"
    const [capacidad, setCapacidad] = useState<number>(1);
    const [unidadCapacidad, setUnidadCapacidad] = useState<UnidadesCapacidad>(UnidadesCapacidad.L);

    // Estado para el precio unitario editable
    const [precioUnitario, setPrecioUnitario] = useState<number>(item.precioUnitario);

    // Estado para el porcentaje de IVA editable
    const [ivaPercentage, setIvaPercentage] = useState<number>(
        tipoIncorporacion === TIPO_INCORPORACION.CON_OC 
            ? item.ivaPercentage 
            : 19 // Default 19% for SIN_OC and AF_EXISTENTE
    );

    // Estado para el método de depreciación común para todo el grupo
    const [depreciacionGrupo, setDepreciacionGrupo] = useState<any>(null);

    // Auto-create assets based on the quantity specified in the purchase order item
    useEffect(() => {
        // Only auto-create assets for CON_OC type and when the list is empty
        // Also check if we have a valid itemOrdenCompraActivo
        if (tipoIncorporacion === TIPO_INCORPORACION.CON_OC && 
            listaActivos.length === 0 && 
            itemOrdenCompraActivo) {

            // Get the quantity from the order item
            const cantidad = item.cantidad;

            // Create the specified number of assets
            const newActivos: ActivoFijo[] = [];
            const timestamp = Date.now(); // Use a single timestamp for all IDs to avoid changing on re-renders

            for (let i = 0; i < cantidad; i++) {
                newActivos.push({
                    id: `temp-${timestamp}-${i}`, // Temporary ID until saved to backend
                    nombre: item.nombre,
                    estado: 0, // Active state
                    brand, // Apply common brand
                    tipo: tipoActivo, // Apply common type
                    precio: calcularPrecioConIVA(), // Use the price with IVA included
                    // Apply common depreciation if it exists
                    ...(depreciacionGrupo && {
                        valorAdquisicion: depreciacionGrupo.vi,
                        valorResidual: depreciacionGrupo.vf,
                        vidaUtilMeses: depreciacionGrupo.Dt,
                        metodoDespreciacion: depreciacionGrupo.metodo
                    }),
                    // For production assets, initialize specific fields
                    ...(tipoActivo === TipoActivo.PRODUCCION && {
                        capacidad,
                        unidadCapacidad
                    })
                });
            }

            // Update the state with the new assets
            setListaActivos(newActivos);
            setActivoFijoGroup(newActivos);
        }
    // Only include dependencies that should trigger asset creation
    // Exclude listaActivos to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tipoIncorporacion, itemOrdenCompraActivo, item.cantidad, item.nombre, setActivoFijoGroup]); // Run only when these critical dependencies change

    // Función para calcular el subtotal basado en el precio unitario editado
    const calcularSubtotal = () => {
        return precioUnitario * item.cantidad;
    };

    // Función para calcular el precio con IVA incluido
    const calcularPrecioConIVA = () => {
        return precioUnitario * (1 + ivaPercentage / 100);
    };

    // Función para actualizar los atributos comunes en todos los activos
    const updateCommonAttributes = (newTipoActivo?: TipoActivo, newBrand?: string, newDepreciacion?: any) => {
        if (listaActivos.length > 0) {
            const updatedActivos = listaActivos.map(activo => ({
                ...activo,
                brand: newBrand !== undefined ? newBrand : brand,
                tipo: newTipoActivo !== undefined ? newTipoActivo : tipoActivo,
                // NOTA: Solución temporal - Agregar campos de capacidad y unidad de capacidad si el tipo es PRODUCCION
                // Esto asegura que los activos existentes se actualicen con estos valores cuando se cambia el tipo
                // y así pasen la validación en ActivosFijosStep1Form.tsx
                ...(newTipoActivo === TipoActivo.PRODUCCION && {
                    capacidad,
                    unidadCapacidad
                }),
                ...(newDepreciacion || depreciacionGrupo ? {
                    valorAdquisicion: (newDepreciacion || depreciacionGrupo).vi,
                    valorResidual: (newDepreciacion || depreciacionGrupo).vf,
                    vidaUtilMeses: (newDepreciacion || depreciacionGrupo).Dt,
                    metodoDespreciacion: (newDepreciacion || depreciacionGrupo).metodo
                } : {})
            }));

            setListaActivos(updatedActivos);
            setActivoFijoGroup(updatedActivos);
        }
    };

    // No necesitamos un useEffect para actualizar los atributos comunes
    // Los handlers de onChange ya se encargan de actualizar los activos

    // Handler for depreciation changes using useCallback to prevent infinite loops
    const handleDepreciacionChange = useCallback((depreciacion) => {
        setDepreciacionGrupo(depreciacion);
        updateCommonAttributes(undefined, undefined, depreciacion);
    }, []);

    // Function to add a new activo
    const addActivo = () => {
        const newActivo: ActivoFijo = {
            id: `temp-${Date.now()}`, // Temporary ID until saved to backend
            nombre: item.nombre,
            estado: 0, // Active state
            brand, // Aplicar el brand común
            tipo: tipoActivo, // Aplicar el tipo común
            // Usar el precio unitario con IVA incluido
            precio: calcularPrecioConIVA(),
            // Aplicar la depreciación común si existe
            ...(depreciacionGrupo && {
                valorAdquisicion: depreciacionGrupo.vi,
                valorResidual: depreciacionGrupo.vf,
                vidaUtilMeses: depreciacionGrupo.Dt,
                metodoDespreciacion: depreciacionGrupo.metodo
            }),
            // Para activos de producción, inicializar campos específicos
            ...(tipoActivo === TipoActivo.PRODUCCION && {
                capacidad,
                unidadCapacidad
            })
        };

        const updatedList = [...listaActivos, newActivo];
        setListaActivos(updatedList);
        setActivoFijoGroup(updatedList);
    };

    // Function to remove an activo
    const removeActivo = () => {
        if (listaActivos.length === 0) return;

        const updatedList = listaActivos.slice(0, -1); // Remove the last item
        setListaActivos(updatedList);
        setActivoFijoGroup(updatedList);
    };

    // Function to update a specific activo
    const updateActivo = (index: number, field: string, value: any) => {
        const updatedActivos = [...listaActivos];
        updatedActivos[index] = {
            ...updatedActivos[index],
            [field]: value
        };
        setListaActivos(updatedActivos);
        setActivoFijoGroup(updatedActivos);
    };

    // Check if add button should be enabled
    const isAddEnabled = tipoIncorporacion === TIPO_INCORPORACION.SIN_OC || 
                         tipoIncorporacion === TIPO_INCORPORACION.AF_EXISTENTE;

    // Check if remove button should be enabled
    const isRemoveEnabled = (tipoIncorporacion === TIPO_INCORPORACION.SIN_OC ||
                             tipoIncorporacion === TIPO_INCORPORACION.AF_EXISTENTE) && 
                             listaActivos.length > 0;

    return (
        <Flex direction="column" width="100%">
            <Card boxShadow='lg' mb={4}>
                <CardHeader bg={"blue.200"} p={4}>
                    <Flex justifyContent="space-between" alignItems="center">
                        <Heading size="md">{item.nombre}</Heading>
                        <HStack spacing={2}>
                            <IconButton
                                aria-label="Add activo"
                                icon={<AddIcon />}
                                colorScheme="green"
                                size="sm"
                                isDisabled={!isAddEnabled}
                                onClick={addActivo}
                            />
                            <IconButton
                                aria-label="Remove activo"
                                icon={<MinusIcon />}
                                colorScheme="red"
                                size="sm"
                                isDisabled={!isRemoveEnabled}
                                onClick={removeActivo}
                            />
                        </HStack>
                    </Flex>
                </CardHeader>
                <CardBody p={4}>
                    <Box mb={4}>
                        <Text fontWeight="bold">Cantidad de activos: {listaActivos.length}</Text>
                        <Flex alignItems="center" mb={2}>
                            <Text mr={2}>Valor unitario sin IVA: $</Text>
                            <Input 
                                type="number"
                                value={precioUnitario}
                                onChange={(e) => {
                                    const newPrecioUnitario = parseFloat(e.target.value);

                                    // Validate that the price is a positive number
                                    if (isNaN(newPrecioUnitario) || newPrecioUnitario < 0) {
                                        return;
                                    }

                                    setPrecioUnitario(newPrecioUnitario);

                                    // Actualizar el precio de todos los activos con IVA incluido
                                    if (listaActivos.length > 0) {
                                        const updatedActivos = listaActivos.map(activo => ({
                                            ...activo,
                                            precio: calcularPrecioConIVA()
                                        }));
                                        setListaActivos(updatedActivos);
                                        setActivoFijoGroup(updatedActivos);
                                    }
                                }}
                                size="sm"
                                width="100px"
                            />
                        </Flex>

                        {/* Información de IVA */}
                        <Flex alignItems="center" mb={2}>
                            <Text mr={2}>IVA (%): </Text>
                            <Input 
                                type="number"
                                value={ivaPercentage}
                                onChange={(e) => {
                                    const newIvaPercentage = parseFloat(e.target.value);

                                    // Validate that the IVA percentage is a non-negative number
                                    if (isNaN(newIvaPercentage) || newIvaPercentage < 0) {
                                        return;
                                    }

                                    setIvaPercentage(newIvaPercentage);

                                    // Actualizar el precio de todos los activos con el nuevo IVA
                                    if (listaActivos.length > 0) {
                                        const updatedActivos = listaActivos.map(activo => ({
                                            ...activo,
                                            precio: calcularPrecioConIVA()
                                        }));
                                        setListaActivos(updatedActivos);
                                        setActivoFijoGroup(updatedActivos);
                                    }
                                }}
                                size="sm"
                                width="70px"
                            />
                            <Text ml={2}>Valor IVA: ${(precioUnitario * ivaPercentage / 100).toFixed(2)}</Text>
                        </Flex>

                        {/* Valor con IVA */}
                        <Flex alignItems="center" mb={2}>
                            <Text mr={2} fontWeight="bold">Valor unitario con IVA: $</Text>
                            <Text fontWeight="bold">{calcularPrecioConIVA().toFixed(2)}</Text>
                        </Flex>
                    </Box>

                    {/* Atributos comunes para todo el grupo */}
                    <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50" mb={4}>
                        <Text fontWeight="bold" mb={2}>Atributos comunes del grupo</Text>
                        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                            <GridItem>
                                <FormControl>
                                    <FormLabel>Tipo de Activo</FormLabel>
                                    <Select 
                                        value={tipoActivo}
                                        onChange={(e) => {
                                            const newTipoActivo = e.target.value as TipoActivo;
                                            setTipoActivo(newTipoActivo);
                                            updateCommonAttributes(newTipoActivo, undefined, undefined);
                                        }}
                                    >
                                        <option value={TipoActivo.EQUIPO}>Equipos</option>
                                        <option value={TipoActivo.MOBILIARIO}>Mobiliario</option>
                                        <option value={TipoActivo.PRODUCCION}>Activo de Producción</option>
                                    </Select>
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl>
                                    <FormLabel>Marca</FormLabel>
                                    <Input 
                                        value={brand} 
                                        onChange={(e) => {
                                            const newBrand = e.target.value;
                                            setBrand(newBrand);
                                            updateCommonAttributes(undefined, newBrand, undefined);
                                        }}
                                        placeholder="Ej: Dell, Lenovo, Fluke..."
                                    />
                                </FormControl>
                            </GridItem>
                            {tipoActivo === TipoActivo.PRODUCCION && (
                                <>
                                    <GridItem>
                                        <FormControl>
                                            <FormLabel>Capacidad</FormLabel>
                                            <Input 
                                                type="number"
                                                placeholder="Capacidad"
                                                value={capacidad}
                                                onChange={(e) => {
                                                    const newCapacidad = parseFloat(e.target.value);

                                                    // Validate that the capacity is a positive number
                                                    if (isNaN(newCapacidad) || newCapacidad < 0) {
                                                        return;
                                                    }

                                                    setCapacidad(newCapacidad);
                                                    // Actualizar la capacidad en todos los activos
                                                    if (listaActivos.length > 0) {
                                                        const updatedActivos = listaActivos.map(activo => ({
                                                            ...activo,
                                                            capacidad: newCapacidad
                                                        }));
                                                        setListaActivos(updatedActivos);
                                                        setActivoFijoGroup(updatedActivos);
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                    </GridItem>
                                    <GridItem>
                                        <FormControl>
                                            <FormLabel>Unidad de Capacidad</FormLabel>
                                            <Select 
                                                value={unidadCapacidad}
                                                onChange={(e) => {
                                                    const newUnidadCapacidad = e.target.value as UnidadesCapacidad;
                                                    setUnidadCapacidad(newUnidadCapacidad);
                                                    // Actualizar la unidad de capacidad en todos los activos
                                                    if (listaActivos.length > 0) {
                                                        const updatedActivos = listaActivos.map(activo => ({
                                                            ...activo,
                                                            unidadCapacidad: newUnidadCapacidad
                                                        }));
                                                        setListaActivos(updatedActivos);
                                                        setActivoFijoGroup(updatedActivos);
                                                    }
                                                }}
                                            >
                                                <option value={UnidadesCapacidad.L}>Litros (L)</option>
                                                <option value={UnidadesCapacidad.KG}>Kilogramos (KG)</option>
                                                <option value={UnidadesCapacidad.TON}>Toneladas (TON)</option>
                                                <option value={UnidadesCapacidad.M3}>Metros cúbicos (M3)</option>
                                                <option value={UnidadesCapacidad.W}>Watts (W)</option>
                                                <option value={UnidadesCapacidad.HP}>Horse Power (HP)</option>
                                            </Select>
                                        </FormControl>
                                    </GridItem>
                                </>
                            )}
                        </Grid>
                    </Box>

                    {/* Lista de activos individuales */}
                    {listaActivos.map((activo, index) => (
                        <Box 
                            key={activo.id} 
                            p={3} 
                            mb={3} 
                            borderWidth="1px" 
                            borderRadius="md"
                            bg="gray.50"
                        >
                            <Text fontWeight="bold">Activo #{index + 1}</Text>
                            <Grid templateColumns="repeat(2, 1fr)" gap={4} mt={2}>
                                <GridItem>
                                    <FormControl>
                                        <FormLabel>ID</FormLabel>
                                        <Input 
                                            value={activo.id} 
                                            onChange={(e) => updateActivo(index, 'id', e.target.value)}
                                        />
                                    </FormControl>
                                </GridItem>
                                <GridItem>
                                    <FormControl>
                                        <FormLabel>Nombre</FormLabel>
                                        <Input 
                                            value={activo.nombre} 
                                            onChange={(e) => updateActivo(index, 'nombre', e.target.value)}
                                        />
                                    </FormControl>
                                </GridItem>

                            </Grid>
                        </Box>
                    ))}

                    {listaActivos.length === 0 && (
                        <Box p={4} textAlign="center" color="gray.500">
                            No hay activos registrados. {isAddEnabled ? 'Haga clic en el botón + para agregar.' : ''}
                        </Box>
                    )}

                    <Divider my={4} />

                    {/* Método de depreciación común para todo el grupo */}
                    {listaActivos.length > 0 && (
                        <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50" mb={4}>
                            <Text fontWeight="bold" mb={2}>Método de Depreciación (común para todo el grupo)</Text>
                            <MetodoDepreciacionComponent 
                                setDepreciacion={handleDepreciacionChange}
                                initialValue={calcularPrecioConIVA()}
                                initialResidualValue={0}
                            />
                        </Box>
                    )}
                </CardBody>
            </Card>
        </Flex>
    );
}
