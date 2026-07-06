import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { Flex, Button, Select, Text } from '@chakra-ui/react';

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
                <Select
                    value={size}
                    onChange={(e) => handleSizeChange(parseInt(e.target.value))}
                    width='80px'
                    isDisabled={loading}
                >
                    {[5, 10, 20, 50].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </Select>
            </Flex>
            <Flex align='center' gap={2}>
                <Button
                    size='sm'
                    variant='outline'
                    leftIcon={<ChevronLeftIcon />}
                    onClick={() => onPageChange(page - 1)}
                    isDisabled={isPrevDisabled}
                    aria-label={previousLabel}
                >
                    {previousLabel}
                </Button>
                <Text>Pagina {totalPages === 0 ? 0 : page + 1} de {totalPages}</Text>
                <Button
                    size='sm'
                    variant='outline'
                    rightIcon={<ChevronRightIcon />}
                    onClick={() => onPageChange(page + 1)}
                    isDisabled={loading || isNextDisabled}
                    aria-label={nextLabel}
                >
                    {nextLabel}
                </Button>
            </Flex>
        </Flex>
    );
}
