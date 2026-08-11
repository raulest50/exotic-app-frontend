import {useState} from 'react';
import { Steps, NativeSelect, Input, Button, IconButton, HStack } from '@chakra-ui/react';
import { LuRepeat, LuSearch } from 'react-icons/lu';

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
        <HStack gap={3}>
            <NativeSelect.Root>
                <NativeSelect.Field
                    value={tipoFiltro}
                    onValueChange={(e) => handleFiltroChange(e.target.value)}
                    width='170px'
                    size='md'>
                    <option value='sin_filtro'>Sin filtro</option>
                    <option value='filtro_por_lote'>Filtro por Lote</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
            </NativeSelect.Root>

            {tipoFiltro === 'sin_filtro' && (
                <IconButton
                    aria-label='Refrescar'
                    onClick={onRefresh}
                    loading={isLoading}
                    colorPalette='teal'
                    size='md'><LuRepeat /></IconButton>
            )}

            {tipoFiltro === 'filtro_por_lote' && (
                <>
                    <Input
                        placeholder='Número de lote'
                        value={loteInput}
                        onValueChange={(e) => setLoteInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        width='200px'
                        size='md'
                        type='text'
                    />
                    <Button
                        onClick={handleSearch}
                        loading={isLoading}
                        colorPalette='teal'
                        size='md'
                        disabled={!loteInput.trim()}><LuSearch />Buscar
                                            </Button>
                </>
            )}
        </HStack>
    );
}
