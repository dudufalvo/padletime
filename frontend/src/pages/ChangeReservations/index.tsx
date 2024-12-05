import styles from './change.module.scss'
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
import { useForm, FormProvider } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import InputText from 'components/Form/InputText'
import Button from 'components/Button'

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

type TableMessageType = {
  reservation_id: number;
  client: string;
  date: string;
  initial_time: string;
  end_time: string;
  price: string;
  field: string;
  cancelled: boolean;
}

type TableCheckboxType = {
  reservation_id: number;
  cancelled: boolean;
}

type FieldType = {
  id: number;
  date: string;
  time: string;
}

const validationSchema = yup.object().shape({
  id: yup.number().required('ID is required'),
  date: yup.string().required('Date is required').matches(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in the format YYYY-MM-DD'),
  time: yup.string().required('Time name is required').matches(/^\d{2}:\d{2}$/, 'Time must be in the format HH:MM')
})

const TableCheckbox = ({ reservation_id, cancelled }: TableCheckboxType) => {
  const handleChange = () => {
    const data = {
      reservation_id: reservation_id,
      cancelled: !cancelled
    }
    axios.put(`${import.meta.env.VITE_API_BASE_URL}/reservations/${reservation_id}/cancel`, { data: data } ,{ headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(() => {
        toast.success('Reservation cancelled successfully');
      })
      .catch((response) => {
        console.log(response)
        toast.error('Error cancelling reservation');
      })
  }

  return (
    <input type='checkbox' defaultChecked={cancelled} disabled={cancelled} onChange={handleChange} />
  )
}

const ChangeReservations = () => {
  const [futureReservations, setFutureReservations] = useState<TableMessageType[]>([]);

  const methods = useForm<FieldType>({
    resolver: yupResolver(validationSchema)
  })

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/reservations/future/all`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then((response) => {
        console.log(response.data)
        setFutureReservations(response.data);
      })
      .catch(() => {
        toast.error('Error getting future reservations');
      })
  }
  , [])

  const handleUpdateReservation = (dataPost: FieldType) => {
    const data = {
      date: dataPost.date,
      time: dataPost.time
    }

    axios.put(`${import.meta.env.VITE_API_BASE_URL}/reservations/${dataPost.id}/update`, { data }, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(() => {
        toast.success('Reservation updated successfully');
      })
      .catch((response) => {
        toast.error(response.response.data.error);
      })
  }

  return (
    <div className={styles.main}>
      <div className={styles.table}>
        <h2>Change Reservations</h2>

        <div className={styles.forms}>
          <FormProvider {...methods}>
            <form className={styles.reviewModal}>
              <InputText type='number' label='Reservation ID' name='id' id='id' placeholder="Enter the reservation id" isRequired={true} />
              <InputText label='Date' name='date' id='date' placeholder="Enter the date" isRequired={true} />
              <InputText label='Time' name='time' id='time' placeholder="Enter the time" isRequired={true} />
              <Button type='submit' variant='filled' fullWidth handle={methods.handleSubmit(handleUpdateReservation)}>Update Reservation</Button>
            </form>
          </FormProvider>
        </div>

        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 700 }} aria-label="customized table">
            <TableHead>
              <TableRow>
                <StyledTableCell>Reservation ID</StyledTableCell>
                <StyledTableCell align="right">Client</StyledTableCell>
                <StyledTableCell align="right">Field</StyledTableCell>
                <StyledTableCell align="right">Date</StyledTableCell>
                <StyledTableCell align="right">Initial Time</StyledTableCell>
                <StyledTableCell align="right">End Time</StyledTableCell>
                <StyledTableCell align="right">Price</StyledTableCell>
                <StyledTableCell align="right">Cancel</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {futureReservations.map((row) => (
                <StyledTableRow key={row.reservation_id}>
                  <StyledTableCell component="th" scope="row">
                    {row.reservation_id}
                  </StyledTableCell>
                  <StyledTableCell align="right">{row.client}</StyledTableCell>
                  <StyledTableCell align="right">{row.field}</StyledTableCell>
                  <StyledTableCell align="right">{row.date}</StyledTableCell>
                  <StyledTableCell align="right">{row.initial_time}</StyledTableCell>
                  <StyledTableCell align="right">{row.end_time}</StyledTableCell>
                  <StyledTableCell align="right">{row.price}</StyledTableCell>
                  <StyledTableCell align="right">{<TableCheckbox reservation_id={row.reservation_id} cancelled={row.cancelled}/>}</StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  )
}

export default ChangeReservations