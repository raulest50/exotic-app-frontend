import {IoArrowBack} from "react-icons/io5";
import {Flex, Spacer, Heading, IconButton, Box, HStack} from '@chakra-ui/react'
import {NavLink} from "react-router-dom";

interface HeaderHexEfProps {
    title: string,
}

// Hexagon component using CSS
const Hexagon = () => {
    return (
        <Box
            position="relative"
            width="30px"
            height="30px"
            margin="2px"
            _before={{
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'blue.200',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
            }}
        />
    );
};

// Grid of hexagons in interleaved manner with 2 rows
const HexagonGrid = () => {
    return (
        <Box>
            {/* First row */}
            <Flex mb="-8px">
                {Array(4).fill(0).map((_, i) => (
                    <Hexagon key={`row1-${i}`} />
                ))}
            </Flex>
            {/* Second row - interleaved (shifted) */}
            <Flex ml="15px">
                {Array(3).fill(0).map((_, i) => (
                    <Hexagon key={`row2-${i}`} />
                ))}
            </Flex>
        </Box>
    );
};

export function HeaderHexEf({title}: HeaderHexEfProps) {
    return (
        <Flex pb={'0.2em'} direction={'row'} mb={'1em'} borderBottom={'0.04em solid'} align={'center'}>
            <NavLink to={'/'}>
                <IconButton
                    ml={'1em'} mr={'2em'} my={'0.2em'}
                    flex={1} colorScheme={'teal'}
                    aria-label='atrás' fontSize={'3xl'} boxSize={'2em'} icon={<IoArrowBack/>}/>
            </NavLink>
            <Heading flex={2} as={'h2'} size={'xl'} fontFamily={'Comfortaa Variable'}>{title}</Heading>

            {/* Hexagon grids horizontally after the title */}
            <HStack spacing={6} ml={4} align="center">
                <HexagonGrid />
                <HexagonGrid />
            </HStack>

            <Spacer flex={1}/>
        </Flex>
    );
}
