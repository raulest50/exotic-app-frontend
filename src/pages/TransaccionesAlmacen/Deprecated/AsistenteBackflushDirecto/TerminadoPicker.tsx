import {useState, useEffect} from 'react';
import {
    Button,
    Flex,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Table,
    Tbody,
    Td,
    Th,
    Thead,
    Tr
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL.tsx';
import {Producto} from '../../types.tsx';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (terminados: Producto[]) => void;
    alreadySelected: Producto[];
}

export default function TerminadoPicker({isOpen, onClose, onConfirm, alreadySelected}: Props) {
    const endpoints = new EndPointsURL();
    const [searchText, setSearchText] = useState('');
    const [available, setAvailable] = useState<Producto[]>([]);
    const [selected, setSelected] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchTerminados = async () => {
        setLoading(true);
        try {
            const res = await axios.get(endpoints.search_terminado_byname, {
                params: {search: searchText}
            });
            let list: Producto[] = res.data.content || res.data;
            const ids = new Set([...alreadySelected, ...selected].map(p => p.productoId));
            list = list.filter(p => !ids.has(p.productoId));
            setAvailable(list);
        } catch (e) {
            setAvailable([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchTerminados();
    }, [isOpen]);

    const handleAdd = (p: Producto) => {
        setSelected([...selected, p]);
        setAvailable(available.filter(a => a.productoId !== p.productoId));
    };

    const handleRemove = (p: Producto) => {
        setSelected(selected.filter(a => a.productoId !== p.productoId));
        setAvailable([...available, p]);
    };

    const handleAccept = () => {
        onConfirm(selected);
        setSelected([]);
        setAvailable([]);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="5xl">
            <ModalOverlay/>
            <ModalContent>
                <ModalHeader>Seleccionar Terminados</ModalHeader>
                <ModalCloseButton/>
                <ModalBody>
                    <Flex mb={2} gap={2}>
                        <Input
                            placeholder='Buscar'
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') fetchTerminados();
                            }}
                        />
                        <Button onClick={fetchTerminados} isLoading={loading} loadingText='Buscando'>Buscar</Button>
                    </Flex>
                    <Flex gap={4}>
                        <Table size='sm'>
                            <Thead><Tr><Th>ID</Th><Th>Nombre</Th><Th></Th></Tr></Thead>
                            <Tbody>
                            {available.map(p => (
                                <Tr key={p.productoId}>
                                    <Td>{p.productoId}</Td>
                                    <Td>{p.nombre}</Td>
                                    <Td><Button size='xs' onClick={() => handleAdd(p)}>+</Button></Td>
                                </Tr>
                            ))}
                            </Tbody>
                        </Table>
                        <Table size='sm'>
                            <Thead><Tr><Th>ID</Th><Th>Nombre</Th><Th></Th></Tr></Thead>
                            <Tbody>
                            {selected.map(p => (
                                <Tr key={p.productoId}>
                                    <Td>{p.productoId}</Td>
                                    <Td>{p.nombre}</Td>
                                    <Td><Button size='xs' colorScheme='red' onClick={() => handleRemove(p)}>-</Button></Td>
                                </Tr>
                            ))}
                            </Tbody>
                        </Table>
                    </Flex>
                </ModalBody>
                <ModalFooter>
                    <Button mr={3} onClick={onClose}>Cancelar</Button>
                    <Button colorScheme='teal' onClick={handleAccept}>Aceptar</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

