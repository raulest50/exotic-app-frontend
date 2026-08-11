import { useState } from 'react';
import {
    Steps,
    Box,
    Button,
    Flex,
    IconButton,
    Input,
    InputGroup,
    InputRightElement,
    NativeSelect,
    Field,
} from '@chakra-ui/react';
import UserGenericPicker from '../../../components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx';
import { User } from '../../Usuarios/GestionUsuarios/types';
import { SearchAreaOperativaDTO, SearchType } from './types';
import { LuSearch } from 'react-icons/lu';

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
                <Field.Root maxW="250px">
                    <Field.Label>Buscar por</Field.Label>
                    <NativeSelect.Root>
                        <NativeSelect.Field
                            value={searchType}
                            onValueChange={(e) => handleSearchTypeChange(e.target.value as SearchType)}
                            disabled={loading}>
                            <option value="NOMBRE">Nombre del Área</option>
                            <option value="RESPONSABLE">Usuario Responsable</option>
                            <option value="ID">ID del Área</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Field.Root>

                <Field.Root flex={1} minW="200px">
                    <Field.Label>
                        {searchType === 'NOMBRE' && 'Nombre'}
                        {searchType === 'ID' && 'ID'}
                        {searchType === 'RESPONSABLE' && 'Responsable'}
                    </Field.Label>

                    {searchType === 'NOMBRE' && (
                        <Input
                            value={nombre}
                            onValueChange={(e) => setNombre(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ingrese nombre del área"
                            disabled={loading}
                        />
                    )}

                    {searchType === 'ID' && (
                        <Input
                            type="number"
                            value={areaId}
                            onValueChange={(e) => setAreaId(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ingrese ID del área"
                            disabled={loading}
                        />
                    )}

                    {searchType === 'RESPONSABLE' && (
                        <InputGroup>
                            <Input
                                value={responsable ? `${responsable.cedula} - ${responsable.nombreCompleto || responsable.username}` : ''}
                                placeholder="Seleccione un responsable"
                                readOnly
                                bg="app.inputReadonly"
                            />
                            <InputRightElement>
                                <IconButton
                                    aria-label="Buscar usuario"
                                    size="sm"
                                    onClick={() => setIsUserPickerOpen(true)}
                                    disabled={loading}><LuSearch /></IconButton>
                            </InputRightElement>
                        </InputGroup>
                    )}
                </Field.Root>

                <Button
                    colorPalette="blue"
                    onClick={handleBuscar}
                    loading={loading}
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
