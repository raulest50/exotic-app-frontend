import { useState } from 'react';
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    IconButton,
    Input,
    InputGroup,
    InputRightElement,
    Select,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import UserGenericPicker from '../../../components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx';
import { User } from '../../Usuarios/GestionUsuarios/types';
import { SearchAreaOperativaDTO, SearchType } from './types';

interface FiltroAreasOperativasProps {
    onBuscar: (filtro: SearchAreaOperativaDTO) => void;
    loading: boolean;
}

export default function FiltroAreasOperativas({ onBuscar, loading }: FiltroAreasOperativasProps) {
    const [searchType, setSearchType] = useState<SearchType>('NOMBRE');
    const [nombre, setNombre] = useState('');
    const [areaId, setAreaId] = useState('');
    const [responsable, setResponsable] = useState<User | null>(null);
    const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);

    const handleBuscar = () => {
        const filtro: SearchAreaOperativaDTO = { searchType };

        switch (searchType) {
            case 'NOMBRE':
                filtro.nombre = nombre.trim() || undefined;
                break;
            case 'ID':
                filtro.areaId = areaId.trim() ? parseInt(areaId) : undefined;
                break;
            case 'RESPONSABLE':
                filtro.responsableId = responsable?.id ?? undefined;
                break;
        }

        onBuscar(filtro);
    };

    const handleSearchTypeChange = (newType: SearchType) => {
        setSearchType(newType);
        setNombre('');
        setAreaId('');
        setResponsable(null);
    };

    const handleSelectUser = (user: User) => {
        setResponsable(user);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !loading) {
            handleBuscar();
        }
    };

    return (
        <Box w="full" p={6} borderWidth="1px" borderRadius="lg" boxShadow="md">
            <Flex gap={4} wrap="wrap" alignItems="flex-end">
                <FormControl maxW="250px">
                    <FormLabel>Buscar por</FormLabel>
                    <Select
                        value={searchType}
                        onChange={(e) => handleSearchTypeChange(e.target.value as SearchType)}
                        isDisabled={loading}
                    >
                        <option value="NOMBRE">Nombre del Área</option>
                        <option value="RESPONSABLE">Usuario Responsable</option>
                        <option value="ID">ID del Área</option>
                    </Select>
                </FormControl>

                <FormControl flex={1} minW="200px">
                    <FormLabel>
                        {searchType === 'NOMBRE' && 'Nombre'}
                        {searchType === 'ID' && 'ID'}
                        {searchType === 'RESPONSABLE' && 'Responsable'}
                    </FormLabel>

                    {searchType === 'NOMBRE' && (
                        <Input
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ingrese nombre del área"
                            isDisabled={loading}
                        />
                    )}

                    {searchType === 'ID' && (
                        <Input
                            type="number"
                            value={areaId}
                            onChange={(e) => setAreaId(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ingrese ID del área"
                            isDisabled={loading}
                        />
                    )}

                    {searchType === 'RESPONSABLE' && (
                        <InputGroup>
                            <Input
                                value={responsable ? `${responsable.cedula} - ${responsable.nombreCompleto || responsable.username}` : ''}
                                placeholder="Seleccione un responsable"
                                isReadOnly
                                bg="gray.50"
                            />
                            <InputRightElement>
                                <IconButton
                                    aria-label="Buscar usuario"
                                    icon={<SearchIcon />}
                                    size="sm"
                                    onClick={() => setIsUserPickerOpen(true)}
                                    isDisabled={loading}
                                />
                            </InputRightElement>
                        </InputGroup>
                    )}
                </FormControl>

                <Button
                    colorScheme="blue"
                    onClick={handleBuscar}
                    isLoading={loading}
                    loadingText="Buscando"
                >
                    Buscar
                </Button>
            </Flex>

            <UserGenericPicker
                isOpen={isUserPickerOpen}
                onClose={() => setIsUserPickerOpen(false)}
                onSelectUser={handleSelectUser}
            />
        </Box>
    );
}
