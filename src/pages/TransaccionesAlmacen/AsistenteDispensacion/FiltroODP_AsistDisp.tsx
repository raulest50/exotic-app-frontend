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
    onSearchByLote: (lote: string) => void;
    isLoading: boolean;
}

type FiltroTipo = 'sin_filtro' | 'filtro_por_lote';

export default function FiltroODP_AsistDisp({onRefresh, onSearchByLote, isLoading}: Props) {
    const [tipoFiltro, setTipoFiltro] = useState<FiltroTipo>('sin_filtro');
    const [loteInput, setLoteInput] = useState<string>('');

    const handleFiltroChange = (value: string) => {
        const nuevoTipo = value as FiltroTipo;
        setTipoFiltro(nuevoTipo);
        if (nuevoTipo === 'sin_filtro') {
            setLoteInput('');
            onRefresh();
        }
    };

    const handleSearch = () => {
        const lote = loteInput.trim();
        if (lote.length > 0) {
            onSearchByLote(lote);
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
                width='170px'
                size='md'
            >
                <option value='sin_filtro'>Sin filtro</option>
                <option value='filtro_por_lote'>Filtro por Lote</option>
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
            
            {tipoFiltro === 'filtro_por_lote' && (
                <>
                    <Input
                        placeholder='Número de lote'
                        value={loteInput}
                        onChange={(e) => setLoteInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        width='200px'
                        size='md'
                        type='text'
                    />
                    <Button
                        leftIcon={<SearchIcon />}
                        onClick={handleSearch}
                        isLoading={isLoading}
                        colorScheme='teal'
                        size='md'
                        isDisabled={!loteInput.trim()}
                    >
                        Buscar
                    </Button>
                </>
            )}
        </HStack>
    );
}
