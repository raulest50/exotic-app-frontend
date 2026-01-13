import {useState} from 'react';
import {Flex} from '@chakra-ui/react';
import {FiltroHistorialDispensaciones} from "./FiltroHistorialDispensaciones.tsx";

type Props = {};

export function HistorialDispensaciones(props: Props) {
    return (
        <Flex direction={"column"}>
            <FiltroHistorialDispensaciones />

        </Flex>
    );
}
