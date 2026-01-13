import { useState } from 'react';
import { Flex } from '@chakra-ui/react';
import { FiltroHistorialDispensaciones } from "./FiltroHistorialDispensaciones.tsx";
import { TablaDispensacionesHistorial } from "./TablaDispensacionesHistorial.tsx";

type Props = {};

interface PageResponse {
    content: any[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}

export function HistorialDispensaciones(props: Props) {
    const [resultados, setResultados] = useState<PageResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(0);

    const handleSearchResults = (data: PageResponse) => {
        setResultados(data);
        setCurrentPage(data.number);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // La búsqueda se ejecutará automáticamente mediante el useEffect en FiltroHistorialDispensaciones
    };

    return (
        <Flex direction="column" gap={4}>
            <FiltroHistorialDispensaciones
                onSearchResults={handleSearchResults}
                onLoadingChange={setLoading}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
            />
            <TablaDispensacionesHistorial
                resultados={resultados}
                loading={loading}
                onPageChange={handlePageChange}
            />
        </Flex>
    );
}
