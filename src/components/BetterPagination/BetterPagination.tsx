import { Flex, Button, NativeSelect, Text } from '@chakra-ui/react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

interface BetterPaginationProps {
    page: number;
    size: number;
    totalPages: number;
    loading?: boolean;
    previousLabel?: string;
    nextLabel?: string;
    onPageChange: (page: number) => void;
    onSizeChange: (size: number) => void;
}

export default function BetterPagination({
    page,
    size,
    totalPages,
    loading = false,
    previousLabel = 'Página anterior',
    nextLabel = 'Página siguiente',
    onPageChange,
    onSizeChange,
}: BetterPaginationProps) {
    const isNextDisabled = totalPages === 0 || page + 1 >= totalPages;
    const isPrevDisabled = page === 0 || loading;

    const handleSizeChange = (newSize: number) => {
        onSizeChange(newSize);
        onPageChange(0); // Reset to first page when changing size
    };

    return (
        <Flex justify='space-between' align='center' gap={4}>
            <Flex align='center' gap={2}>
                <Text>Tamaño de página:</Text>
                <NativeSelect.Root>
                    <NativeSelect.Field
                        value={size}
                        onChange={(e) => handleSizeChange(parseInt(e.target.value))}
                        width='80px'
                        disabled={loading}>
                        {[5, 10, 20, 50].map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                </NativeSelect.Root>
            </Flex>
            <Flex align='center' gap={2}>
                <Button
                    size='sm'
                    variant='outline'
                    onClick={() => onPageChange(page - 1)}
                    disabled={isPrevDisabled}
                    aria-label={previousLabel}><LuChevronLeft />{previousLabel}</Button>
                <Text>Pagina {totalPages === 0 ? 0 : page + 1} de {totalPages}</Text>
                <Button
                    size='sm'
                    variant='outline'
                    onClick={() => onPageChange(page + 1)}
                    disabled={loading || isNextDisabled}
                    aria-label={nextLabel}>{nextLabel}<LuChevronRight /></Button>
            </Flex>
        </Flex>
    );
}
