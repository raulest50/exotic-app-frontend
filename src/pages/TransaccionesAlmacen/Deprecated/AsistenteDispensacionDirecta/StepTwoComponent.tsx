import {Box, Button, Flex, FormControl, FormLabel, Heading, Input, Table, Tbody, Td, Text, Tr, useToast} from '@chakra-ui/react';
import {useEffect, useState} from 'react';
import {DispensacionDirectaDetalleItem, DispensacionNoPlanificadaDTO} from '../../types.tsx';
import EndPointsURL from '../../../../api/EndPointsURL.tsx';
import axios from 'axios';
import {useAuth} from '../../../../context/AuthContext.tsx';

interface Props {
    items: DispensacionDirectaDetalleItem[];
    setItems: (items: DispensacionDirectaDetalleItem[]) => void;
    setViewMode: (mode:number)=>void;
}

export default function StepTwoComponent({items, setItems, setViewMode}: Props){
    const [token, setToken] = useState('');
    const [inputToken, setInputToken] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const toast = useToast();
    const { user } = useAuth();

    useEffect(()=>{
        const t = Math.floor(1000 + Math.random() * 9000).toString();
        setToken(t);
        setInputToken('');
    }, [items]);

    const handleCantidadChange = (idx:number, value:number) => {
        setItems(items.map((it,i)=> i===idx ? {...it, cantidad:value} : it));
    };

    const handleLoteChange = (idx:number, value:string) => {
        setItems(items.map((it,i)=> i===idx ? {...it, loteId: value ? parseInt(value) : null} : it));
    };

    const enviar = async () => {
        if(inputToken !== token){
            toast({title:'Token incorrecto', status:'error', duration:3000, isClosable:true});
            return;
        }
        try{
            const dto: DispensacionNoPlanificadaDTO = {
                observaciones,
                usuarioId: parseInt(user ?? '0'),
                items: items.map(it=>({productoId: it.material.productoId.toString(), cantidad: it.cantidad, loteId: it.loteId ?? undefined}))
            };
            const endpoints = new EndPointsURL();
            const endpoint = endpoints.dispensacion_no_planificada;
            await axios.post(endpoint, dto, {withCredentials:true});
            toast({title:'Dispensación registrada', status:'success', duration:3000, isClosable:true});
            setViewMode(0);
            setItems([]);
        }catch(err){
            toast({title:'Error al enviar', status:'error', duration:3000, isClosable:true});
        }
    };

    return (
        <Box p='1em' bg='blue.50'>
            <Flex direction='column' gap={4} align='center'>
                <Heading fontFamily='Comfortaa Variable'>Revisión de Dispensación</Heading>
                <Table size='sm'>
                    <Tbody>
                        {items.map((item,idx)=>(
                            <Tr key={idx}>
                                <Td>{item.material.nombre}</Td>
                                <Td>
                                    <Input value={item.loteId ?? ''} onChange={e=>handleLoteChange(idx, e.target.value)} placeholder='Lote'/>
                                </Td>
                                <Td>{item.cantidadSugerida}</Td>
                                <Td>
                                    <Input type='number' value={item.cantidad} onChange={e=>handleCantidadChange(idx, parseFloat(e.target.value))}/>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
                <FormControl w='40%'>
                    <FormLabel>Observaciones</FormLabel>
                    <Input value={observaciones} onChange={e=>setObservaciones(e.target.value)} />
                </FormControl>
                <FormControl w='40%' isRequired>
                    <FormLabel>Token de verificación</FormLabel>
                    <Input value={inputToken} onChange={e=>setInputToken(e.target.value)} placeholder='Ingrese el token'/>
                </FormControl>
                <Text fontFamily='Comfortaa Variable'>Token: <strong>{token}</strong></Text>
                <Flex w='40%' gap={4}>
                    <Button flex='1' onClick={()=>setViewMode(0)}>Atrás</Button>
                    <Button flex='1' colorScheme='teal' onClick={enviar} isDisabled={inputToken !== token}>Enviar</Button>
                </Flex>
            </Flex>
        </Box>
    );
}

