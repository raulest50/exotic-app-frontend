
import {Outlet} from 'react-router-dom'
import { Flex } from '@chakra-ui/react';


function RootLayout(){
    return(
        <Flex direction={'column'}>
            <Outlet/>
        </Flex>
    );
}

export default RootLayout