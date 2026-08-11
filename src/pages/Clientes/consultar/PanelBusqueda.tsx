import { useState } from 'react';
import { Steps, Flex, Input, Button, Box, NativeSelect, Field } from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import MyPagination from '../../../components/MyPagination.tsx';
import { ListaSearchClientes } from './panel_busqueda_comp/ListaSearchClientes.tsx';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import { Cliente, DTO_SearchCliente, SearchType } from '../types.tsx';

interface Props{
    setEstado: (estado:number)=>void;
    setClienteSeleccionado: (c:Cliente)=>void;
}

export default function PanelBusqueda({setEstado, setClienteSeleccionado}:Props){
    const [searchType, setSearchType] = useState<SearchType>(SearchType.ID);
    const [id, setId] = useState('');
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const endPoints = new EndPointsURL();
    const toast = useAppToast();
    const pageSize = 10;

    const handleSearch = async (pageNumber:number) => {
        setLoading(true);
        setPage(pageNumber);
        try{
            const dto: DTO_SearchCliente = {
                id: searchType===SearchType.ID? Number(id) : null,
                nombre: searchType===SearchType.NOMBRE_O_EMAIL? nombre||null : null,
                email: searchType===SearchType.NOMBRE_O_EMAIL? email||null : null,
                searchType
            };
            const resp = await axios.post(endPoints.search_clientes_pag, dto, {params:{page:pageNumber,size:pageSize}});
            setClientes(resp.data.content);
            setTotalPages(resp.data.totalPages);
        }catch(err){
            toast({title:'Error al buscar', status:'error', duration:4000, isClosable:true});
            setClientes([]); setTotalPages(1);
        }finally{
            setLoading(false);
        }
    };

    const verDetalle = (c:Cliente)=>{
        setClienteSeleccionado(c);
        setEstado(1);
    };

    return (
        <Flex direction='column' p={4}>
            <Box p={4} borderWidth='1px' borderRadius='lg' mb={4}>
                {searchType===SearchType.ID ? (
                    <Field.Root mb={4}>
                        <Field.Label>ID Cliente</Field.Label>
                        <Input value={id} onValueChange={e=>setId(e.target.value)} />
                    </Field.Root>
                ) : (
                    <>
                        <Field.Root mb={4}>
                            <Field.Label>Nombre</Field.Label>
                            <Input value={nombre} onValueChange={e=>setNombre(e.target.value)} />
                        </Field.Root>
                        <Field.Root mb={4}>
                            <Field.Label>Correo Electrónico</Field.Label>
                            <Input value={email} onValueChange={e=>setEmail(e.target.value)} />
                        </Field.Root>
                    </>
                )}
                <Flex gap={4} align='center'>
                    <Field.Root flex={1}>
                        <Field.Label>Tipo de búsqueda</Field.Label>
                        <NativeSelect.Root>
                            <NativeSelect.Field
                                value={searchType}
                                onValueChange={e=>setSearchType(e.target.value as SearchType)}>
                                <option value={SearchType.ID}>ID</option>
                                <option value={SearchType.NOMBRE_O_EMAIL}>Nombre o Correo</option>
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                    </Field.Root>
                    <Button colorPalette='blue' onClick={()=>handleSearch(0)} loading={loading} flex={1} mt={6}>Buscar</Button>
                </Flex>
            </Box>
            <Box mb={4}>
                <ListaSearchClientes clientes={clientes} onVerDetalle={verDetalle}/>
            </Box>
            {totalPages>1 && (
                <MyPagination page={page} totalPages={totalPages} loading={loading} handlePageChange={handleSearch}/>
            )}
        </Flex>
    );
}
