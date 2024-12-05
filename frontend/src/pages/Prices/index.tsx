import styles from './prices.module.scss'
import InputText from 'components/Form/InputText'
import { FormProvider, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import Button from 'components/Button'
import * as yup from 'yup'
import axios from 'axios'
import toast from 'utils/toast'
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { useEffect, useState } from 'react'
import SelectDropdown from 'components/SelectDropdown'
import { DropdownOptionType } from 'types/Component'
import { SingleValue, MultiValue } from 'react-select'

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

type TableCheckboxType = {
  price_id: number,
  price_value: number,
  start_time: string,
  price_type: string,
  is_active: boolean,
}

const TableCheckbox = ({ price_id, price_value, start_time, price_type, is_active }: TableCheckboxType) => {
  const handleChange = () => {
    const data = {
      price_id: price_id,
      price_value: price_value,
      start_time: start_time,
      price_type: price_type,
      is_active: !is_active
    }

    axios.put(`${import.meta.env.VITE_API_BASE_URL}/price/${price_id}/update`, { data }, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(() => {
        toast.success('Price updated successfully');
      })
      .catch(() => {
        toast.error('Failed to update price');
      })
  }

  return (
    <input type='checkbox' defaultChecked={is_active} disabled={true} onChange={handleChange} />
  )
}

type PriceType = {
  price_type: string;
  price_value: number;
}

type PriceValueType = {
  price_value: number;
}

type TableMessageType = {
  price_id: number,
  price_value: number,
  start_time: string,
  price_type: string,
  is_active: boolean,
}

const validationSchema = yup.object().shape({
  price_type: yup.string().required('Price type is required').matches(/^(FIM_SEMANA_[0-9]{2}H[0-9]{2}_[0-9]{2}H[0-9]{2}|SEMANA_[0-9]{2}H[0-9]{2}_[0-9]{2}H[0-9]{2})$/, 'Price type must be in the format FIM_SEMANA_19h30_21h or SEMANA_15h_16h30'),
  price_value: yup.number().required('Price value is required')
})

const validationSchema2 = yup.object().shape({
  price_value: yup.number().required('Price value is required')
})

const Prices = () => {
  const [data, setData] = useState<TableMessageType[]>([]);
  const [selectedOption, setSelectedOption] = useState<DropdownOptionType | null>(null);

  // sort data by is_active and price_id
  const sortedData = data.sort((a, b) => {
    if (a.is_active === b.is_active) {
      return b.price_id - a.price_id
    }
    return a.is_active ? -1 : 1
  })
  const dataOptions = data.filter((item) => item.is_active === true).map((item) => { return { value: item.price_id.toString(), label: item.price_type } })

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/prices`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
    .then((response) => {
      const data = response.data;
      setData(data);
    }
    )
    .catch((error) => {
      console.log(error);
    });
  }
  , []);

  const methods = useForm<PriceType>({
    resolver: yupResolver(validationSchema)
  })

  const methods2 = useForm<PriceValueType>({
    resolver: yupResolver(validationSchema2)
  })

  const handleSelected = (value: SingleValue<DropdownOptionType> | MultiValue<DropdownOptionType>) => {
    if (!value) return
    const filteredOrder = value as DropdownOptionType

    setSelectedOption(filteredOrder)
  }

  const handleCreatePrice = (dataPost: PriceType) => {
    const data = {
      price_value: dataPost.price_value,
      price_type: dataPost.price_type
    }

    axios.post(`${import.meta.env.VITE_API_BASE_URL}/prices/create`, { data: data }, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`}})
      .then(() => {
        toast.success('Price created successfully')
        setTimeout(() => {
          window.location.reload();
        }
        , 1000);
      })
      .catch(() => {
        toast.error('Failed to create price')
      })
  }

  const handleUpdatePrice = (dataUpdate: PriceValueType) => {
    console.log(dataUpdate)
    const data = {
      price_value: dataUpdate.price_value,
      price_type: selectedOption?.label,
      old_price_id: selectedOption?.value
    }

    axios.post(`${import.meta.env.VITE_API_BASE_URL}/prices/create`, { data: data }, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`}})
      .then(() => {
        toast.success('Price updated successfully')
        setTimeout(() => {
          window.location.reload();
        }
        , 1000);
      })
      .catch(() => {
        toast.error('Failed to update price')
      })
  }

  return (
    <div className={styles.main}>
      <div className={styles.table}>
        <h2>Prices</h2>

        <div className={styles.flex}>
          <div className={styles.forms}>
            <FormProvider {...methods}>
              <form className={styles.reviewModal}>
                <InputText label='Price Type' name='price_type' id='price_type' placeholder="Enter the price type: SEMANA_15h_16h30, FIM_SEMANA_19h30_21h" isRequired={true} />
                <InputText type='number' label='Price Value' name='price_value' id='price_value' placeholder="Enter the price value" isRequired={true} />
                <Button type='submit' variant='filled' fullWidth handle={methods.handleSubmit(handleCreatePrice)}>Create Price</Button>
              </form>
            </FormProvider>
          </div>

          <div className={styles.forms}>
          <SelectDropdown type='select' sendOptionsToParent={handleSelected} options={dataOptions} label='Price Type' name='price_type' />
            <FormProvider {...methods2}>
              <form className={styles.reviewModal}>
                <InputText type='number' label='Price Value' name='price_value' id='price_value' placeholder="Enter the price value" isRequired={true} />
                <Button type='submit' variant='filled' fullWidth handle={methods2.handleSubmit(handleUpdatePrice)}>Update Price</Button>
              </form>
            </FormProvider>
          </div>
        </div>

        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 700 }} aria-label="customized table">
            <TableHead>
              <TableRow>
                <StyledTableCell>Price ID</StyledTableCell>
                <StyledTableCell align="right">Start Time</StyledTableCell>
                <StyledTableCell align="right">Price Type</StyledTableCell>
                <StyledTableCell align="right">Price Value</StyledTableCell>
                <StyledTableCell align="right">Active</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedData?.map((row) => (
                <StyledTableRow key={row.price_id}>
                  <StyledTableCell component="th" scope="row">
                    {row.price_id}
                  </StyledTableCell>
                  <StyledTableCell align="right">{row.start_time}</StyledTableCell>
                  <StyledTableCell align="right">{row.price_type}</StyledTableCell>
                  <StyledTableCell align="right">{row.price_value}</StyledTableCell>
                  <StyledTableCell align="right">{<TableCheckbox price_id={row.price_id} price_value={row.price_value} start_time={row.start_time} price_type={row.price_type} is_active={row.is_active} />}</StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  )
}

export default Prices
