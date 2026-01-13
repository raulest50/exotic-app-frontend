import {useState} from 'react';
import {
    Select,
    Input,
    Button,
    IconButton,
    HStack
} from '@chakra-ui/react';
import {RepeatIcon, SearchIcon} from '@chakra-ui/icons';

interface Props {
    onRefresh: () => void;
    onSearchById: (ordenId: number) => void;
    isLoading: boolean;
}

type FiltroTipo = 'sin_filtro' | 'filtro_por_id';

export default function FiltroODP_AsistDisp({onRefresh, onSearchById, isLoading}: Props) {
    const [tipoFiltro, setTipoFiltro] = useState<FiltroTipo>('sin_filtro');
    const [ordenIdInput, setOrdenIdInput] = useState<string>('');

    const handleFiltroChange = (value: string) => {
        const nuevoTipo = value as FiltroTipo;
        setTipoFiltro(nuevoTipo);
        if (nuevoTipo === 'sin_filtro') {
            setOrdenIdInput('');
        }
    };

    const handleSearch = () => {
        const ordenId = parseInt(ordenIdInput.trim());
        if (!isNaN(ordenId) && ordenId > 0) {
            onSearchById(ordenId);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <HStack spacing={3}>
            <Select
                value={tipoFiltro}
                onChange={(e) => handleFiltroChange(e.target.value)}
                width='150px'
                size='md'
            >
                <option value='sin_filtro'>Sin filtro</option>
                <option value='filtro_por_id'>Filtro por ID</option>
            </Select>
            
            {tipoFiltro === 'sin_filtro' && (
                <IconButton
                    aria-label='Refrescar'
                    icon={<RepeatIcon />}
                    onClick={onRefresh}
                    isLoading={isLoading}
                    colorScheme='teal'
                    size='md'
                />
            )}
            
            {tipoFiltro === 'filtro_por_id' && (
                <>
                    <Input
                        placeholder='ID de orden'
                        value={ordenIdInput}
                        onChange={(e) => setOrdenIdInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        width='150px'
                        size='md'
                        type='number'
                        min={1}
                    />
                    <Button
                        leftIcon={<SearchIcon />}
                        onClick={handleSearch}
                        isLoading={isLoading}
                        colorScheme='teal'
                        size='md'
                        isDisabled={!ordenIdInput.trim() || isNaN(parseInt(ordenIdInput.trim())) || parseInt(ordenIdInput.trim()) <= 0}
                    >
                        Buscar
                    </Button>
                </>
            )}
        </HStack>
    );
}

