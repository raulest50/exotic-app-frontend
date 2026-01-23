import { useState, useRef } from 'react';
import {
    Container,
    FormControl,
    FormLabel,
    Input,
    Button,
    Grid,
    GridItem,
    VStack,
    Textarea,
    Icon,
    useToast
} from '@chakra-ui/react';
import { FaFileCircleQuestion, FaFileCircleCheck } from 'react-icons/fa6';
import axios from 'axios';
import EndPointsURL from '../../api/EndPointsURL.tsx';
import { ClienteFormData } from './types.tsx';

const endPoints = new EndPointsURL();

export default function CodificarCliente(){
    const [formData, setFormData] = useState<ClienteFormData>({
        nombre: '',
        email: '',
        telefono: '',
        direccion: '',
        condicionesPago: '',
        limiteCredito: undefined
    });
    const [rutFile, setRutFile] = useState<File | null>(null);
    const [camaraFile, setCamaraFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const rutInputRef = useRef<HTMLInputElement>(null);
    const camaraInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    const handleChange = (field: keyof ClienteFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validate = (): boolean => {
        if(!formData.nombre.trim() || !formData.email.trim() || !formData.telefono.trim() || !formData.direccion.trim()){
            toast({title:'Campos obligatorios', description:'Nombre, correo electrónico, teléfono y dirección son requeridos', status:'warning', duration:4000, isClosable:true});
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(formData.email)){
            toast({title:'Correo electrónico inválido', status:'error', duration:4000, isClosable:true});
            return false;
        }
        const phoneRegex = /^\+?\d{7,}$/;
        if(!phoneRegex.test(formData.telefono)){
            toast({title:'Teléfono inválido', status:'error', duration:4000, isClosable:true});
            return false;
        }
        return true;
    };

    const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(file){
            if(!file.name.toLowerCase().endsWith('.pdf')){
                toast({title:'Solo PDF permitido', status:'error', duration:4000, isClosable:true});
                e.target.value='';
                return;
            }
            setRutFile(file);
        }
    };

    const handleCamaraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(file){
            if(!file.name.toLowerCase().endsWith('.pdf')){
                toast({title:'Solo PDF permitido', status:'error', duration:4000, isClosable:true});
                e.target.value='';
                return;
            }
            setCamaraFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!validate()) return;

        const formDataToSend = new FormData();
        formDataToSend.append('cliente', new Blob([JSON.stringify(formData)],{type:'application/json'}));
        if(rutFile) formDataToSend.append('rutFile', rutFile);
        if(camaraFile) formDataToSend.append('camaraFile', camaraFile);

        try{
            setLoading(true);
            const resp = await axios.post(endPoints.save_clientes, formDataToSend, {headers:{'Content-Type':'multipart/form-data'}});
            toast({title:'Cliente registrado', description:`Cliente ID ${resp.data.clienteId}`, status:'success', duration:5000, isClosable:true});
            setFormData({nombre:'',email:'',telefono:'',direccion:'',condicionesPago:'',limiteCredito:undefined});
            setRutFile(null); setCamaraFile(null);
        }catch(err){
            toast({title:'Error al registrar', status:'error', duration:5000, isClosable:true});
        }finally{
            setLoading(false);
        }
    };

    const isFormValid = formData.nombre.trim() && formData.email.trim() && formData.telefono.trim() && formData.direccion.trim();

    return (
        <Container minW={['auto','container.lg','container.xl']} w='full' h='full'>
            <form onSubmit={handleSubmit}>
                <Grid templateColumns={['1fr','repeat(2,1fr)']} gap={4} p='1em' boxShadow='base'>
                    <GridItem>
                        <FormControl isRequired>
                            <FormLabel>Nombre</FormLabel>
                            <Input value={formData.nombre} onChange={e=>handleChange('nombre',e.target.value)} />
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl isRequired>
                            <FormLabel>Correo Electrónico</FormLabel>
                            <Input type='email' value={formData.email} onChange={e=>handleChange('email',e.target.value)} />
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl isRequired>
                            <FormLabel>Teléfono</FormLabel>
                            <Input value={formData.telefono} onChange={e=>handleChange('telefono',e.target.value)} />
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl isRequired>
                            <FormLabel>Dirección</FormLabel>
                            <Input value={formData.direccion} onChange={e=>handleChange('direccion',e.target.value)} />
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl>
                            <FormLabel>Condiciones de Pago</FormLabel>
                            <Input value={formData.condicionesPago||''} onChange={e=>handleChange('condicionesPago',e.target.value)} />
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl>
                            <FormLabel>Límite de Crédito</FormLabel>
                            <Input type='number' value={formData.limiteCredito||''} onChange={e=>handleChange('limiteCredito',Number(e.target.value))} />
                        </FormControl>
                    </GridItem>
                    <GridItem colSpan={[1,2]}>
                        <FormControl>
                            <FormLabel>Observaciones</FormLabel>
                            <Textarea value={''} isDisabled />
                        </FormControl>
                    </GridItem>
                </Grid>
                <Grid templateColumns={['1fr','repeat(2,1fr)']} gap={4} mt={6} p='1em' boxShadow='base'>
                    <GridItem>
                        <FormControl>
                            <VStack spacing={4} align='center'>
                                <FormLabel>RUT</FormLabel>
                                <Icon as={rutFile ? FaFileCircleCheck : FaFileCircleQuestion} boxSize='4em' color={rutFile ? 'green' : 'orange.500'} />
                                <Button onClick={()=>rutInputRef.current?.click()}>Examinar</Button>
                                <Input type='file' ref={rutInputRef} style={{display:'none'}} accept='application/pdf' onChange={handleRutChange}/>
                            </VStack>
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl>
                            <VStack spacing={4} align='center'>
                                <FormLabel>Cámara y Comercio</FormLabel>
                                <Icon as={camaraFile ? FaFileCircleCheck : FaFileCircleQuestion} boxSize='4em' color={camaraFile ? 'green' : 'orange.500'} />
                                <Button onClick={()=>camaraInputRef.current?.click()}>Examinar</Button>
                                <Input type='file' ref={camaraInputRef} style={{display:'none'}} accept='application/pdf' onChange={handleCamaraChange}/>
                            </VStack>
                        </FormControl>
                    </GridItem>
                </Grid>
                <Button type='submit' colorScheme='blue' mt={6} isLoading={loading} isDisabled={!isFormValid}>Registrar Cliente</Button>
            </form>
        </Container>
    );
}
