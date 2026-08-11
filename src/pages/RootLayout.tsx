
import {Outlet} from 'react-router-dom'
import { Steps, Flex } from '@chakra-ui/react';


function RootLayout(){
    return(
        <Flex direction={'column'}>
            <Outlet/>
        </Flex>
    );
}

export default RootLayout