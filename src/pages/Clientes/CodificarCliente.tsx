import { useState, useRef } from 'react';
import {
    Container,
    Input,
    Button,
    Grid,
    GridItem,
    VStack,
    Textarea,
    Icon,
    Field,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
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
    const toast = useAppToast();

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
                        <Field.Root required>
                            <Field.Label>Nombre</Field.Label>
                            <Input value={formData.nombre} onChange={e=>handleChange('nombre',e.target.value)} />
                        </Field.Root>
                    </GridItem>
                    <GridItem>
                        <Field.Root required>
                            <Field.Label>Correo Electrónico</Field.Label>
                            <Input type='email' value={formData.email} onChange={e=>handleChange('email',e.target.value)} />
                        </Field.Root>
                    </GridItem>
                    <GridItem>
                        <Field.Root required>
                            <Field.Label>Teléfono</Field.Label>
                            <Input value={formData.telefono} onChange={e=>handleChange('telefono',e.target.value)} />
                        </Field.Root>
                    </GridItem>
                    <GridItem>
                        <Field.Root required>
                            <Field.Label>Dirección</Field.Label>
                            <Input value={formData.direccion} onChange={e=>handleChange('direccion',e.target.value)} />
                        </Field.Root>
                    </GridItem>
                    <GridItem>
                        <Field.Root>
                            <Field.Label>Condiciones de Pago</Field.Label>
                            <Input value={formData.condicionesPago||''} onChange={e=>handleChange('condicionesPago',e.target.value)} />
                        </Field.Root>
                    </GridItem>
                    <GridItem>
                        <Field.Root>
                            <Field.Label>Límite de Crédito</Field.Label>
                            <Input type='number' value={formData.limiteCredito||''} onChange={e=>handleChange('limiteCredito',Number(e.target.value))} />
                        </Field.Root>
                    </GridItem>
                    <GridItem colSpan={[1,2]}>
                        <Field.Root>
                            <Field.Label>Observaciones</Field.Label>
                            <Textarea value={''} disabled />
                        </Field.Root>
                    </GridItem>
                </Grid>
                <Grid templateColumns={['1fr','repeat(2,1fr)']} gap={4} mt={6} p='1em' boxShadow='base'>
                    <GridItem>
                        <Field.Root>
                            <VStack gap={4} align='center'>
                                <Field.Label>RUT</Field.Label>
                                <Icon as={rutFile ? FaFileCircleCheck : FaFileCircleQuestion} boxSize='4em' color={rutFile ? 'green' : 'orange.500'} />
                                <Button onClick={()=>rutInputRef.current?.click()}>Examinar</Button>
                                <Input type='file' ref={rutInputRef} style={{display:'none'}} accept='application/pdf' onChange={handleRutChange}/>
                            </VStack>
                        </Field.Root>
                    </GridItem>
                    <GridItem>
                        <Field.Root>
                            <VStack gap={4} align='center'>
                                <Field.Label>Cámara y Comercio</Field.Label>
                                <Icon as={camaraFile ? FaFileCircleCheck : FaFileCircleQuestion} boxSize='4em' color={camaraFile ? 'green' : 'orange.500'} />
                                <Button onClick={()=>camaraInputRef.current?.click()}>Examinar</Button>
                                <Input type='file' ref={camaraInputRef} style={{display:'none'}} accept='application/pdf' onChange={handleCamaraChange}/>
                            </VStack>
                        </Field.Root>
                    </GridItem>
                </Grid>
                <Button type='submit' colorPalette='blue' mt={6} loading={loading} disabled={!isFormValid}>Registrar Cliente</Button>
            </form>
        </Container>
    );
}
