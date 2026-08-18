import { Flex, Button, NativeSelect, Text } from '@chakra-ui/react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

interface BetterPaginationProps {
    page: number;
    size: number;
    totalPages: number;
    totalItems?: number;
    sizeOptions?: readonly number[];
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
    totalItems,
    sizeOptions = [5, 10, 20, 50],
    loading = false,
    previousLabel = 'Página anterior',
    nextLabel = 'Página siguiente',
    onPageChange,
    onSizeChange,
}: BetterPaginationProps) {
    const isNextDisabled = totalPages === 0 || page + 1 >= totalPages;
    const isPrevDisabled = page === 0 || loading;
    const firstVisibleItem = totalItems && totalItems > 0 ? page * size + 1 : 0;
    const lastVisibleItem = totalItems === undefined
        ? 0
        : Math.min((page + 1) * size, totalItems);

    const handleSizeChange = (newSize: number) => {
        onSizeChange(newSize);
        onPageChange(0); // Reset to first page when changing size
    };

    return (
        <Flex
            justify='space-between'
            align={{ base: 'stretch', md: 'center' }}
            direction={{ base: 'column', md: 'row' }}
            gap={3}
        >
            <Flex align='center' gap={2}>
                <Text>Tamaño de página:</Text>
                <NativeSelect.Root width='80px' disabled={loading}>
                    <NativeSelect.Field
                        value={size}
                        onChange={(e) => handleSizeChange(parseInt(e.target.value))}>
                        {sizeOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                </NativeSelect.Root>
            </Flex>
            <Flex align='center' justify={{ base: 'space-between', md: 'flex-end' }} gap={2}>
                <Button
                    size='sm'
                    variant='outline'
                    onClick={() => onPageChange(page - 1)}
                    disabled={isPrevDisabled}
                    aria-label={previousLabel}><LuChevronLeft />{previousLabel}</Button>
                <Text fontSize='sm' textAlign='center'>
                    {totalItems === undefined
                        ? `Página ${totalPages === 0 ? 0 : page + 1} de ${totalPages}`
                        : `${firstVisibleItem}–${lastVisibleItem} de ${totalItems} · Página ${totalPages === 0 ? 0 : page + 1} de ${totalPages}`}
                </Text>
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
