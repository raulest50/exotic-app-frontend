import React from 'react';
import { Flex, Button } from '@chakra-ui/react';

interface PaginationProps {
    page: number;
    totalPages: number;
    loading: boolean;
    handlePageChange: (page: number) => void;
}

const MyPagination: React.FC<PaginationProps> = ({ page, totalPages, loading, handlePageChange }) => {
    if (totalPages <= 1) {
        return null; // No renderizar paginación si solo hay una página
    }

    return (
        <Flex w={"auto"} mt={6} justifyContent="center" alignItems="center">
            <Button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0 || loading}
                mr={2}
            >
                Anterior
            </Button>
            {Array.from({ length: totalPages }, (_, index) => (
                <Button
                    key={index}
                    onClick={() => handlePageChange(index)}
                    variant={index === page ? 'solid' : 'outline'}
                    mx={1}
                    disabled={loading}
                >
                    {index + 1}
                </Button>
            ))}
            <Button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages - 1 || loading}
                ml={2}
            >
                Siguiente
            </Button>
        </Flex>
    );
};

export default MyPagination;