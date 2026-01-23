import React, {useState} from 'react';
import axios from 'axios';
import {Flex, Select, Input, IconButton, Spinner} from '@chakra-ui/react';
import {RepeatIcon} from '@chakra-ui/icons';

type Props = {
    currencyIsUSD : [boolean, React.Dispatch<React.SetStateAction<boolean>>],
    useCurrentUsd2Cop: (usd2cop:number) => void; 
};


export function SelectCurrencyTrm({
    currencyIsUSD,
    useCurrentUsd2Cop,}: Props) {

    const TIPO_TRM = {ARBITRARIA:'ARBITRARIA', FECHA:'FECHA', ACTUAL:'ACTUAL'};

    const [usd2copState, setUsd2copState] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [currency, setCurrency] = useState<string>(currencyIsUSD[0] ? 'USD' : 'COP');
    const [tipoTRM, setTipoTRM] = useState<string>(TIPO_TRM.ACTUAL);

    // Loading states for fetch operations
    const [loadingLatestTRM, setLoadingLatestTRM] = useState<boolean>(false);
    const [loadingTRMByDate, setLoadingTRMByDate] = useState<boolean>(false);

    const TRM_BASE_URL = import.meta.env.DEV ? '/datos-gov' : 'https://www.datos.gov.co';

    const fetchLatestTRM = async () => {
        // Prevent multiple requests while loading
        if (loadingLatestTRM) return;

        try {
            setLoadingLatestTRM(true);
            const response = await axios.get(
                `${TRM_BASE_URL}/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC`
            );
            const trm = response.data[0].valor;
            setUsd2copState(trm);
            useCurrentUsd2Cop(Number(trm));
        } catch (error) {
            console.error('Error fetching TRM:', error);
        } finally {
            setLoadingLatestTRM(false);
        }
    };

    const fetchTRMbyDate = async () => {
        // Prevent multiple requests while loading
        if (loadingTRMByDate) return;

        try {
            setLoadingTRMByDate(true);
            const response = await axios.get(
                `${TRM_BASE_URL}/resource/32sa-8pi3.json?vigenciadesde=${date}`
            );
            if (response.data.length > 0) {
                const trm = response.data[0].valor;
                setUsd2copState(trm);
                useCurrentUsd2Cop(Number(trm));
            }
        } catch (error) {
            console.error('Error fetching TRM by date:', error);
        } finally {
            setLoadingTRMByDate(false);
        }
    }

    return (
        <Flex direction={"column"} flex={3}>
            <Select
                value={currency}
                onChange={(e) => {
                    const cur = e.target.value;
                    setCurrency(cur);
                    cur == 'USD' ? currencyIsUSD[1](true) : currencyIsUSD[1](false);
                }}
            >
                <option value={'USD'} >USD</option>
                <option value={'COP'} >COP</option>
            </Select>

            <Flex
                direction={"row"}
                display={currencyIsUSD[0] ? 'flex' : 'none'}
            >

                <Select
                    value={tipoTRM}
                    onChange={(e) => setTipoTRM(e.target.value)}
                    flex={1}
                >
                    <option value={TIPO_TRM.ACTUAL} >{TIPO_TRM.ACTUAL}</option>
                    <option value={TIPO_TRM.FECHA} >{TIPO_TRM.FECHA}</option>
                    <option value={TIPO_TRM.ARBITRARIA} >{TIPO_TRM.ARBITRARIA}</option>
                </Select>
                {tipoTRM === TIPO_TRM.ACTUAL && (
                    <Flex>
                        <Input
                            value={usd2copState}
                            onChange={(e) => {
                                setUsd2copState(e.target.value);
                                useCurrentUsd2Cop(Number(e.target.value));
                            }}
                            readOnly={true}
                        />
                        <IconButton
                            aria-label='Obtener última TRM'
                            icon={loadingLatestTRM ? <Spinner size="sm" /> : <RepeatIcon/>}
                            onClick={() => fetchLatestTRM()}
                            isDisabled={loadingLatestTRM}
                        />
                    </Flex>
                )}
                {tipoTRM === TIPO_TRM.FECHA && (
                    <Flex flex={3}>
                        <Input
                            flex={2}
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                        <Input
                            flex={2}
                            value={usd2copState}
                            onChange={(e) => {
                                setUsd2copState(e.target.value);
                                useCurrentUsd2Cop(Number(e.target.value));
                            }}
                            readOnly={true}
                        />
                        <IconButton
                            flex={1}
                            aria-label='Obtener TRM por fecha'
                            icon={loadingTRMByDate ? <Spinner size="sm" /> : <RepeatIcon/>}
                            onClick={() => fetchTRMbyDate()}
                            isDisabled={loadingTRMByDate}
                        />
                    </Flex>
                )}
                {tipoTRM === TIPO_TRM.ARBITRARIA && (
                    <Flex flex={3}>
                        <Input
                            autoFocus
                            value={usd2copState}
                            onChange={(e) => {
                                setUsd2copState(e.target.value);
                                useCurrentUsd2Cop(Number(e.target.value));
                            }}
                        />
                    </Flex>
                )}
            </Flex>

        </Flex>
    );
}
