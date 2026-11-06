
import {Outlet} from 'react-router-dom'
import { Flex } from '@chakra-ui/react';
import { AuthorizedAgentAssistant } from './AgentAssistant/AuthorizedAgentAssistant';


function RootLayout(){
    return(
        <Flex direction={'column'}>
            <Outlet/>
            <AuthorizedAgentAssistant />
        </Flex>
    );
}

export default RootLayout
