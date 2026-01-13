import {Box, Button, Flex, Heading, Input, Table, Tbody, Td, Tr, useDisclosure, useToast} from '@chakra-ui/react';
import MateriaPrimaPicker from '../../components/MateriaPrimaPicker.tsx';
import {Material, DispensacionDirectaItem, DispensacionDirectaDetalleItem, DispensacionNoPlanificadaDTO} from '../../types.tsx';
import {useState} from 'react';
import EndPointsURL from '../../../../api/EndPointsURL.tsx';
import axios from 'axios';

interface Props {
    setViewMode: (mode: number) => void;
    setDispensacion: (items: DispensacionDirectaDetalleItem[]) => void;
}

export default function StepOneComponent({setViewMode, setDispensacion}: Props){
    const [items, setItems] = useState<DispensacionDirectaItem[]>([]);
    const {isOpen, onOpen, onClose} = useDisclosure();
    const toast = useToast();

    const agregarMateria = (mat: Material) => {
        if(items.find(it=>it.material.productoId === mat.productoId)) return;
        setItems([...items, {material: mat, cantidad: 0}]);
    };

    const handleCantidadChange = (idx:number, value:number) => {
        const newItems = items.map((it,i)=> i===idx ? {...it, cantidad: value} : it);
        setItems(newItems);
    };

    const handleRemove = (idx:number) => {
        setItems(items.filter((_,i)=>i!==idx));
    };

    const handleContinuar = async () => {
        if(items.length === 0){
            toast({title:'Error', description:'Agregue al menos un material', status:'error', duration:3000, isClosable:true});
            return;
        }
        if(items.some(it=>it.cantidad <= 0)){
            toast({title:'Error', description:'Las cantidades deben ser mayores a cero', status:'error', duration:3000, isClosable:true});
            return;
        }
        try{
            const reqItems = items.map(it=>({productoId: it.material.productoId.toString(), cantidad: it.cantidad}));
            const endpoints = new EndPointsURL();
            const endpoint = endpoints.recomendar_lotes_multiple;
            const resp = await axios.post<DispensacionNoPlanificadaDTO>(endpoint, {items: reqItems}, {withCredentials:true});
            const matMap = new Map(items.map(it=>[it.material.productoId.toString(), it.material]));
            const detalle: DispensacionDirectaDetalleItem[] = resp.data.items.map(it=>({
                material: matMap.get(it.productoId)!,
                loteId: it.loteId ?? null,
                cantidadSugerida: it.cantidad,
                cantidad: it.cantidad
            }));
            setDispensacion(detalle);
            setViewMode(1);
        }catch(err){
            toast({title:'Error', description:'No se pudo obtener la recomendación de lotes', status:'error', duration:3000, isClosable:true});
        }
    };

    return (
        <Box p='1em' bg='blue.50'>
            <Flex direction='column' gap={4} align='center'>
                <Heading fontFamily='Comfortaa Variable'>Agregar Materiales</Heading>
                <Table size='sm'>
                    <Tbody>
                        {items.map((item,idx)=>(
                            <Tr key={item.material.productoId}>
                                <Td>{item.material.nombre}</Td>
                                <Td>
                                    <Input type='number' value={item.cantidad} onChange={e=>handleCantidadChange(idx, parseFloat(e.target.value))}/>
                                </Td>
                                <Td>
                                    <Button size='sm' onClick={()=>handleRemove(idx)}>Quitar</Button>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
                <Button onClick={onOpen} colorScheme='teal'>Agregar Material</Button>
                <Button colorScheme='blue' onClick={handleContinuar}>Continuar</Button>
                <MateriaPrimaPicker isOpen={isOpen} onClose={onClose} onSelectMateriaPrima={agregarMateria}/>
            </Flex>
        </Box>
    );
}

