import {Box, Button, Flex, Heading, Text} from '@chakra-ui/react';
import React, {useEffect, useMemo, useState} from 'react';
import {CasePackResponseDTO, DispensacionDTO, InsumoDesglosado, LoteSeleccionado} from '../types';
import {LotePickerDispensacion} from './AsistenteDispensacionComponents/LotePickerDispensacion';
import {InsumoWithStock} from '../../Produccion/types';
import ResumenHistorialDispensaciones from './ResumenHistorialDispensaciones';
import {getAccessLevel} from '../../../api/UserApi';
import TablaDispensacionInsumos from './TablaDispensacionInsumos';
import TablaDispensacionInsumosEmpaque from './TablaDispensacionInsumosEmpaque';

interface Props {
    setActiveStep: (step:number)=>void;
    dispensacion: DispensacionDTO | null;
    setDispensacion: (dto: DispensacionDTO) => void;
    insumosDesglosados?: InsumoDesglosado[];
    ordenProduccionId?: number | null;
    lotesPorMaterial?: Map<string, LoteSeleccionado[]>;
    setLotesPorMaterial?: (lotes: Map<string, LoteSeleccionado[]>) => void;
    insumosAnidados?: any[];
    productoId?: string | null;
    insumosEmpaque?: InsumoDesglosado[];
    unitsPerCase?: number;
    casePack?: CasePackResponseDTO | null;
    cantidadProducir?: number | null;
    lotesPorMaterialEmpaque?: Map<string, LoteSeleccionado[]>;
    setLotesPorMaterialEmpaque?: (lotes: Map<string, LoteSeleccionado[]>) => void;
}

type InsumoWithStockResponse = Omit<InsumoWithStock, 'tipo_producto' | 'subInsumos'> & {
    tipo_producto?: string;
    tipoProducto?: string;
    tipoUnidades?: string;
    subInsumos?: InsumoWithStockResponse[];
};

export default function StepTwoComponent({
    setActiveStep, 
    dispensacion, 
    setDispensacion, 
    insumosDesglosados, 
    ordenProduccionId, 
    lotesPorMaterial: lotesPorMaterialProp, 
    setLotesPorMaterial: setLotesPorMaterialProp,
    insumosAnidados = [],
    productoId,
    insumosEmpaque = [],
    unitsPerCase,
    casePack,
    cantidadProducir,
    lotesPorMaterialEmpaque: lotesPorMaterialEmpaqueProp,
    setLotesPorMaterialEmpaque: setLotesPorMaterialEmpaqueProp
}: Props){
    // Estado para lotes seleccionados por material (key: productoId)
    // Si viene como prop, usarlo; sino crear estado local
    const [lotesPorMaterialLocal, setLotesPorMaterialLocal] = useState<Map<string, LoteSeleccionado[]>>(new Map());
    const lotesPorMaterial = lotesPorMaterialProp || lotesPorMaterialLocal;
    const setLotesPorMaterial = setLotesPorMaterialProp || setLotesPorMaterialLocal;
    
    // Estado para lotes seleccionados por material de empaque
    const [lotesPorMaterialEmpaqueLocal, setLotesPorMaterialEmpaqueLocal] = useState<Map<string, LoteSeleccionado[]>>(new Map());
    const lotesPorMaterialEmpaque = lotesPorMaterialEmpaqueProp || lotesPorMaterialEmpaqueLocal;
    const setLotesPorMaterialEmpaque = setLotesPorMaterialEmpaqueProp || setLotesPorMaterialEmpaqueLocal;
    
    const [modalAbierto, setModalAbierto] = useState<{productoId: string; productoNombre: string; cantidadRequerida: number; esEmpaque?: boolean} | null>(null);
    
    // Estado para controlar qué semiterminados están expandidos
    const [expandedSemiterminados, setExpandedSemiterminados] = useState<Record<string, boolean>>({});
    const [totalesHistorico, setTotalesHistorico] = useState<Map<string, number>>(new Map());
    const [accessLevel, setAccessLevel] = useState<number | null>(null);

    const handleAbrirModal = (insumo: InsumoDesglosado) => {
        setModalAbierto({
            productoId: insumo.productoId,
            productoNombre: insumo.productoNombre,
            cantidadRequerida: insumo.cantidadTotalRequerida
        });
    };

    const handleCerrarModal = () => {
        setModalAbierto(null);
    };

    const handleAceptarLotes = (productoId: string, lotes: LoteSeleccionado[], esEmpaque: boolean = false) => {
        if (esEmpaque) {
            const nuevoMap = new Map(lotesPorMaterialEmpaque);
            nuevoMap.set(productoId, lotes);
            setLotesPorMaterialEmpaque(nuevoMap);
        } else {
        const nuevoMap = new Map(lotesPorMaterial);
        nuevoMap.set(productoId, lotes);
        setLotesPorMaterial(nuevoMap);
        }
    };

    // Función para normalizar insumos anidados del backend
    const normalizeInsumo = (insumo: InsumoWithStockResponse): InsumoWithStock => ({
        ...insumo,
        tipo_producto: insumo.tipo_producto ?? insumo.tipoProducto ?? '',
        tipoUnidades: insumo.tipoUnidades ?? 'KG',
        subInsumos: (insumo.subInsumos ?? []).map(normalizeInsumo)
    });

    // Función para fusionar estructura anidada con datos planos
    const mergeInsumosData = (
        nestedInsumos: InsumoWithStock[], 
        flatInsumos: InsumoDesglosado[]
    ): InsumoDesglosado[] => {
        // Crear un mapa de datos planos por productoId para acceso rápido
        const flatMap = new Map<string, InsumoDesglosado>();
        flatInsumos.forEach(insumo => {
            flatMap.set(insumo.productoId, insumo);
        });

        // Función recursiva para fusionar
        const mergeRecursive = (nested: InsumoWithStock[]): InsumoDesglosado[] => {
            return nested.map(insumo => {
                const flatData = flatMap.get(String(insumo.productoId));
                // Obtener inventareable del insumo anidado (si tiene) o del plano, con default true
                const inventareable = flatData?.inventareable ?? (insumo as any).inventareable ?? true;
                const merged: InsumoDesglosado = {
                    productoId: String(insumo.productoId),
                    productoNombre: insumo.productoNombre,
                    cantidadTotalRequerida: flatData?.cantidadTotalRequerida ?? insumo.cantidadRequerida,
                    tipoUnidades: flatData?.tipoUnidades ?? insumo.tipoUnidades ?? 'KG',
                    tipoProducto: flatData?.tipoProducto ?? (insumo.tipo_producto === 'S' ? 'SEMITERMINADO' : 'MATERIAL'),
                    tipo_producto: insumo.tipo_producto,
                    seguimientoId: flatData?.seguimientoId,
                    lotesSeleccionados: flatData?.lotesSeleccionados,
                    inventareable: inventareable,
                    subInsumos: insumo.subInsumos && insumo.subInsumos.length > 0 
                        ? mergeRecursive(insumo.subInsumos) 
                        : undefined
                };
                return merged;
            });
        };

        return mergeRecursive(nestedInsumos);
    };

    // Procesar insumos: usar estructura anidada si está disponible, sino usar plana
    const insumosProcesados = useMemo(() => {
        if (insumosAnidados && insumosAnidados.length > 0 && insumosDesglosados && insumosDesglosados.length > 0) {
            const normalized = insumosAnidados.map(normalizeInsumo);
            return mergeInsumosData(normalized, insumosDesglosados);
        }
        // Fallback a estructura plana
        return insumosDesglosados || [];
    }, [insumosAnidados, insumosDesglosados]);

    // Función para determinar si un insumo es un semiterminado
    const esSemiterminado = (insumo: InsumoDesglosado): boolean => {
        return insumo.tipo_producto === 'S' || insumo.tipoProducto === 'SEMITERMINADO';
    };

    // Función para determinar si un insumo es inventariable
    const esInventariable = (insumo: InsumoDesglosado): boolean => {
        // Si inventareable es undefined o null, asumir true (comportamiento por defecto)
        return insumo.inventareable !== false;
    };

    const casePackEmpaqueMap = useMemo(() => {
        const map = new Map<string, number>();
        if (casePack?.insumosEmpaque && casePack.insumosEmpaque.length > 0) {
            casePack.insumosEmpaque.forEach(insumo => {
                if (insumo.materialId) {
                    map.set(insumo.materialId, insumo.cantidad);
                }
            });
        }
        return map;
    }, [casePack]);

    const getCantidadEmpaque = (insumo: InsumoDesglosado): number => {
        const unitsPerCaseValue = casePack?.unitsPerCase ?? unitsPerCase;
        const unitsPerCaseValid = typeof unitsPerCaseValue === 'number' && unitsPerCaseValue > 0;
        const cantidadOrden = typeof cantidadProducir === 'number' && cantidadProducir > 0
            ? cantidadProducir
            : null;
        const baseCantidad = casePackEmpaqueMap.get(insumo.productoId);

        if (unitsPerCaseValid && cantidadOrden !== null && baseCantidad !== undefined) {
            return (cantidadOrden / unitsPerCaseValue) * baseCantidad;
        }

        if (unitsPerCaseValid) {
            return insumo.cantidadTotalRequerida / unitsPerCaseValue;
        }

        return insumo.cantidadTotalRequerida;
    };

    useEffect(() => {
        const fetchAccessLevel = async () => {
            try {
                const level = await getAccessLevel('TRANSACCIONES_ALMACEN');
                setAccessLevel(level);
            } catch {
                setAccessLevel(null);
            }
        };
        fetchAccessLevel();
    }, []);

    const totalesSeleccionados = useMemo(() => {
        const map = new Map<string, number>();
        lotesPorMaterial.forEach((lotes, productoId) => {
            const total = lotes.reduce((suma, lote) => suma + lote.cantidad, 0);
            if (total > 0) {
                map.set(productoId, total);
            }
        });
        lotesPorMaterialEmpaque.forEach((lotes, productoId) => {
            const total = lotes.reduce((suma, lote) => suma + lote.cantidad, 0);
            if (total > 0) {
                map.set(productoId, (map.get(productoId) ?? 0) + total);
            }
        });
        return map;
    }, [lotesPorMaterial, lotesPorMaterialEmpaque]);

    const materialesInventariables = useMemo(() => {
        const materiales: InsumoDesglosado[] = [];
        const collect = (insumos: InsumoDesglosado[]) => {
            insumos.forEach(insumo => {
                const esSemi = esSemiterminado(insumo);
                const tieneSubInsumos = insumo.subInsumos && insumo.subInsumos.length > 0;
                const esMaterial = !esSemi && !tieneSubInsumos;
                if (esMaterial && esInventariable(insumo)) {
                    materiales.push(insumo);
                }
                if (tieneSubInsumos && insumo.subInsumos) {
                    collect(insumo.subInsumos);
                }
            });
        };
        collect(insumosProcesados);
        return materiales;
    }, [insumosProcesados]);

    const materialesEmpaqueInventariables = useMemo(() => {
        return insumosEmpaque.filter(insumo => esInventariable(insumo));
    }, [insumosEmpaque]);

    const excedidos = useMemo(() => {
        const excedidosLocal: {productoId: string; requerido: number; total: number}[] = [];
        const tolerance = 0.01;

        materialesInventariables.forEach((material) => {
            const requerido = material.cantidadTotalRequerida;
            const total = (totalesHistorico.get(material.productoId) ?? 0) + (totalesSeleccionados.get(material.productoId) ?? 0);
            if (total - requerido > tolerance) {
                excedidosLocal.push({productoId: material.productoId, requerido, total});
            }
        });

        materialesEmpaqueInventariables.forEach((material) => {
            const requerido = getCantidadEmpaque(material);
            const total = (totalesHistorico.get(material.productoId) ?? 0) + (totalesSeleccionados.get(material.productoId) ?? 0);
            if (total - requerido > tolerance) {
                excedidosLocal.push({productoId: material.productoId, requerido, total});
            }
        });

        return excedidosLocal;
    }, [materialesInventariables, materialesEmpaqueInventariables, totalesHistorico, totalesSeleccionados, getCantidadEmpaque]);

    const requiereNivel2 = excedidos.length > 0 && (accessLevel === null || accessLevel < 2);

    // Función para manejar el clic en el botón de expandir/colapsar
    const toggleSemiterminado = (productoId: string) => {
        setExpandedSemiterminados(prev => ({
            ...prev,
            [productoId]: !prev[productoId]
        }));
    };

    // Si hay insumos desglosados, mostrar esos; sino, usar el sistema anterior
    if(insumosProcesados && insumosProcesados.length > 0) {
        return (
            <Box p='1em' bg='blue.50'>
                <Flex direction='column' gap={4} align='center'>
                    <Heading fontFamily='Comfortaa Variable'>Materiales Necesarios</Heading>
                    <Text fontFamily='Comfortaa Variable' fontSize='sm' color='gray.600'>
                        Lista completa desglosada de materiales base requeridos para la orden de producción
                    </Text>
                    <TablaDispensacionInsumos
                        insumos={insumosProcesados}
                        lotesPorMaterial={lotesPorMaterial}
                        onDefinirLotes={handleAbrirModal}
                        expandedSemiterminados={expandedSemiterminados}
                        onToggleSemiterminado={toggleSemiterminado}
                    />
                    {/* Tabla de materiales de empaque */}
                    {insumosEmpaque && insumosEmpaque.length > 0 && (
                        <>
                            <Heading fontFamily='Comfortaa Variable' size='md' mt={6}>
                                Materiales de Empaque
                            </Heading>
                            <Text fontFamily='Comfortaa Variable' fontSize='sm' color='gray.600'>
                                Materiales de empaque requeridos para la orden de producción
                            </Text>
                            <TablaDispensacionInsumosEmpaque
                                insumosEmpaque={insumosEmpaque}
                                lotesPorMaterialEmpaque={lotesPorMaterialEmpaque}
                                getCantidadEmpaque={getCantidadEmpaque}
                                onDefinirLotesEmpaque={(insumo, cantidadEmpaque) => {
                                    setModalAbierto({
                                        productoId: insumo.productoId,
                                        productoNombre: insumo.productoNombre,
                                        cantidadRequerida: cantidadEmpaque,
                                        esEmpaque: true
                                    });
                                }}
                            />
                        </>
                    )}
                    <ResumenHistorialDispensaciones
                        ordenProduccionId={ordenProduccionId ?? null}
                        onTotalesChange={setTotalesHistorico}
                    />
                    <Flex w='40%' gap={4}>
                        <Button flex='1' onClick={()=>setActiveStep(0)}>Atrás</Button>
                        <Button 
                            flex='1' 
                            colorScheme='teal' 
                            onClick={() => {
                                // Guardar lotesPorMaterial antes de avanzar
                                if (setLotesPorMaterial) {
                                    setLotesPorMaterial(lotesPorMaterial);
                                }
                                if (setLotesPorMaterialEmpaque) {
                                    setLotesPorMaterialEmpaque(lotesPorMaterialEmpaque);
                                }
                                setActiveStep(2);
                            }}
                            isDisabled={requiereNivel2}
                        >
                            Continuar
                        </Button>
                    </Flex>
                    {requiereNivel2 && (
                        <Text fontSize="sm" color="red.600" textAlign="center">
                            La suma de dispensaciones supera la receta. Solo usuarios nivel 2 del módulo
                            TRANSACCIONES_ALMACEN pueden continuar con esa dispensación.
                        </Text>
                    )}
                </Flex>

                {/* Modal para seleccionar lotes */}
                {modalAbierto && (
                    <LotePickerDispensacion
                        isOpen={true}
                        onClose={handleCerrarModal}
                        onAccept={(lotes) => handleAceptarLotes(modalAbierto.productoId, lotes, modalAbierto.esEmpaque || false)}
                        productoId={modalAbierto.productoId}
                        productoNombre={modalAbierto.productoNombre}
                        cantidadRequerida={modalAbierto.cantidadRequerida}
                    />
                )}
            </Box>
        );
    }

    // Sistema anterior (compatibilidad)
    if(!dispensacion){
        return <Text>No se ha cargado ninguna orden.</Text>;
    }

    return (
        <Box p='1em' bg='blue.50'>
            <Flex direction='column' gap={4} align='center'>
                <Heading fontFamily='Comfortaa Variable'>Dispensación Sugerida</Heading>
                <Text>No hay insumos disponibles para mostrar.</Text>
                <Flex w='40%' gap={4}>
                    <Button flex='1' onClick={()=>setActiveStep(0)}>Atrás</Button>
                    <Button flex='1' colorScheme='teal' onClick={()=>setActiveStep(2)}>Continuar</Button>
                </Flex>
            </Flex>
        </Box>
    );
}
