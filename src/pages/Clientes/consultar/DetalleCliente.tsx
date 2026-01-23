import { useState, useEffect, useRef } from 'react';
import {
    Box, Button, Flex, Heading, Text, VStack, Grid, GridItem,
    FormControl, FormLabel, Input, Icon, HStack, useToast
} from '@chakra-ui/react';
import { ArrowBackIcon, EditIcon } from '@chakra-ui/icons';
import { FaFileCircleQuestion, FaFileCircleCheck } from 'react-icons/fa6';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import { Cliente } from '../types.tsx';
import { useAuth } from '../../../context/AuthContext';
import { Authority } from '../../../api/global_types.tsx';

interface Props{
    cliente: Cliente;
    setEstado:(estado:number)=>void;
    setClienteSeleccionado?: (c:Cliente)=>void;
    refreshSearch?: ()=>void;
}

export function DetalleCliente({cliente,setEstado,setClienteSeleccionado,refreshSearch}:Props){
    const [editMode,setEditMode] = useState(false);
    const [clienteData,setClienteData] = useState<Cliente>({...cliente});
    const [clientesAccessLevel,setClientesAccessLevel]=useState(0);
    const [rutFile,setRutFile] = useState<File|null>(null);
    const [camaraFile,setCamaraFile] = useState<File|null>(null);
    const rutInputRef = useRef<HTMLInputElement>(null);
    const camaraInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();
    const endPoints = new EndPointsURL();
    const {user} = useAuth();

    useEffect(()=>{
        const fetchLevel = async ()=>{
            try{
                const resp = await axios.get(endPoints.whoami);
                const auths:Authority[] = resp.data.authorities;
                const cAuth = auths.find(a=>a.authority==='ACCESO_CLIENTES');
                if(cAuth) setClientesAccessLevel(parseInt(cAuth.nivel));
            }catch(e){ console.error(e); }
        };
        fetchLevel();
    },[]);

    const handleBack=()=>{
        setEstado(0);
        refreshSearch && refreshSearch();
    };

    const handleInputChange = (field: keyof Cliente, value:any)=>{
        setClienteData(prev=>({...prev,[field]:value}));
    };

    const validate = ():boolean=>{
        if(!clienteData.nombre.trim() || !clienteData.email.trim() || !clienteData.telefono.trim() || !clienteData.direccion.trim()){
            toast({title:'Campos requeridos',status:'warning',duration:4000,isClosable:true});
            return false;
        }
        const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(clienteData.email)){
            toast({title:'Correo electrónico inválido',status:'error',duration:4000,isClosable:true});
            return false;
        }
        const phoneRegex=/^\+?\d{7,}$/;
        if(!phoneRegex.test(clienteData.telefono)){
            toast({title:'Teléfono inválido',status:'error',duration:4000,isClosable:true});
            return false;
        }
        return true;
    };

    const handleRutChange=(e:React.ChangeEvent<HTMLInputElement>)=>{
        const file=e.target.files?.[0];
        if(file){
            if(!file.name.toLowerCase().endsWith('.pdf')){
                toast({title:'Solo PDF permitido',status:'error',duration:4000,isClosable:true});
                e.target.value='';
                return;
            }
            setRutFile(file);
        }
    };

    const handleCamaraChange=(e:React.ChangeEvent<HTMLInputElement>)=>{
        const file=e.target.files?.[0];
        if(file){
            if(!file.name.toLowerCase().endsWith('.pdf')){
                toast({title:'Solo PDF permitido',status:'error',duration:4000,isClosable:true});
                e.target.value='';
                return;
            }
            setCamaraFile(file);
        }
    };

    const handleSaveChanges=async()=>{
        if(!validate()) return;
        try{
            const formData = new FormData();
            formData.append('cliente', new Blob([JSON.stringify(clienteData)],{type:'application/json'}));
            if(rutFile) formData.append('rutFile', rutFile);
            if(camaraFile) formData.append('camaraFile', camaraFile);
            const url = endPoints.update_clientes.replace('{id}', clienteData.clienteId.toString());
            const resp = await axios.put(url, formData,{headers:{'Content-Type':'multipart/form-data'}});
            toast({title:'Cliente actualizado',status:'success',duration:5000,isClosable:true});
            setEditMode(false);
            setClienteData(resp.data);
            setRutFile(null); setCamaraFile(null);
            setClienteSeleccionado && setClienteSeleccionado(resp.data);
        }catch(e){
            console.error(e);
            toast({title:'Error al actualizar',status:'error',duration:5000,isClosable:true});
        }
    };

    const canEdit = user==='master' || clientesAccessLevel>=3;

    return (
        <Box p={5} bg='white' borderRadius='md' boxShadow='base'>
            <Flex justifyContent='space-between' alignItems='center' mb={5}>
                <Button leftIcon={<ArrowBackIcon />} colorScheme='blue' variant='outline' onClick={handleBack}>Regresar</Button>
                <Heading size='lg'>Detalle del Cliente</Heading>
                {canEdit && !editMode && (
                    <Button leftIcon={<EditIcon />} colorScheme='green' onClick={()=>setEditMode(true)}>Editar</Button>
                )}
                {editMode && (
                    <HStack>
                        <Button colorScheme='red' variant='outline' onClick={()=>{setEditMode(false);setClienteData({...cliente});setRutFile(null);setCamaraFile(null);}}>Cancelar</Button>
                        <Button colorScheme='green' onClick={handleSaveChanges}>Guardar</Button>
                    </HStack>
                )}
            </Flex>
            <Grid templateColumns='repeat(2,1fr)' gap={6}>
                <GridItem>
                    <VStack align='start' spacing={3}>
                        <Box>
                            <Text fontWeight='bold'>Nombre:</Text>
                            {editMode ? <Input value={clienteData.nombre} onChange={e=>handleInputChange('nombre',e.target.value)} /> : <Text>{cliente.nombre}</Text>}
                        </Box>
                        <Box>
                            <Text fontWeight='bold'>Correo Electrónico:</Text>
                            {editMode ? <Input value={clienteData.email} onChange={e=>handleInputChange('email',e.target.value)} /> : <Text>{cliente.email}</Text>}
                        </Box>
                        <Box>
                            <Text fontWeight='bold'>Teléfono:</Text>
                            {editMode ? <Input value={clienteData.telefono} onChange={e=>handleInputChange('telefono',e.target.value)} /> : <Text>{cliente.telefono}</Text>}
                        </Box>
                        <Box>
                            <Text fontWeight='bold'>Dirección:</Text>
                            {editMode ? <Input value={clienteData.direccion} onChange={e=>handleInputChange('direccion',e.target.value)} /> : <Text>{cliente.direccion}</Text>}
                        </Box>
                    </VStack>
                </GridItem>
                <GridItem>
                    <VStack align='start' spacing={3}>
                        <Box>
                            <Text fontWeight='bold'>Condiciones de Pago:</Text>
                            {editMode ? <Input value={clienteData.condicionesPago||''} onChange={e=>handleInputChange('condicionesPago',e.target.value)} /> : <Text>{cliente.condicionesPago||'-'}</Text>}
                        </Box>
                        <Box>
                            <Text fontWeight='bold'>Límite de Crédito:</Text>
                            {editMode ? <Input type='number' value={clienteData.limiteCredito||''} onChange={e=>handleInputChange('limiteCredito',Number(e.target.value))} /> : <Text>{cliente.limiteCredito||'-'}</Text>}
                        </Box>
                    </VStack>
                </GridItem>
            </Grid>
            {editMode && (
                <Grid templateColumns='repeat(2,1fr)' gap={6} mt={6}>
                    <GridItem>
                        <VStack spacing={4} align='center'>
                            <FormLabel>RUT</FormLabel>
                            <Icon as={rutFile ? FaFileCircleCheck : FaFileCircleQuestion} boxSize='4em' color={rutFile ? 'green' : 'orange.500'} />
                            <Button onClick={()=>rutInputRef.current?.click()}>Seleccionar archivo</Button>
                            <Input type='file' ref={rutInputRef} style={{display:'none'}} accept='application/pdf' onChange={handleRutChange}/>
                            {rutFile && <Text>{rutFile.name}</Text>}
                        </VStack>
                    </GridItem>
                    <GridItem>
                        <VStack spacing={4} align='center'>
                            <FormLabel>Cámara y Comercio</FormLabel>
                            <Icon as={camaraFile ? FaFileCircleCheck : FaFileCircleQuestion} boxSize='4em' color={camaraFile ? 'green' : 'orange.500'} />
                            <Button onClick={()=>camaraInputRef.current?.click()}>Seleccionar archivo</Button>
                            <Input type='file' ref={camaraInputRef} style={{display:'none'}} accept='application/pdf' onChange={handleCamaraChange}/>
                            {camaraFile && <Text>{camaraFile.name}</Text>}
                        </VStack>
                    </GridItem>
                </Grid>
            )}
        </Box>
    );
}
