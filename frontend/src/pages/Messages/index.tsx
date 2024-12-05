import styles from './messages.module.scss'
import InputText from 'components/Form/InputText'
import InputTextArea from 'components/Form/InputTextArea'
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
import { useUser } from 'contexts/userContext'

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
  sender_email: string,
  receiver_email: string,
  is_read: boolean
}

type ClientRequestType = {
  email: string
}

const TableCheckbox = ({ sender_email, receiver_email, is_read }: TableCheckboxType) => {
  const { user } = useUser()

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const data: ClientRequestType = {
      email: receiver_email
    }

    if (event.target.checked) {
      axios.post(`${import.meta.env.VITE_API_BASE_URL}/client/admin`, { data } ,{ headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(() => {
        toast.success('User promoted to admin');
      })
      .catch(() => {
        toast.error('Error promoting user to admin');
      });
    }
    else {
      axios.post(`${import.meta.env.VITE_API_BASE_URL}/client/regular`, { data }, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(() => {
        toast.success('User demoted to regular');
      })
      .catch(() => {
        toast.error('Error demoting user to regular');
      });
    }
  }

  return (
    <input type='checkbox' defaultChecked={is_read} disabled={user.email == sender_email} onChange={handleChange} />
  )
}

type MessageType = {
  email: string;
  message: string;
}

type TableMessageType = {
  notification_id: number;
  sender: string;
  sender_email: string;
  receiver: string;
  receiver_email: string;
  message: string;
  is_read: boolean;
}

const validationSchema = yup.object().shape({
  email: yup.string().required('Email is required'),
  message: yup.string().required('Message is required')
})

const Messages = () => {
  const [data, setData] = useState<TableMessageType[]>([]);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/manual-notification`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
    .then((response) => {
      const data = response.data;
      console.log(data)
      setData(data);
    }
    )
    .catch((error) => {
      console.log(error);
    });
  }
  , []);

  const methods = useForm<MessageType>({
    resolver: yupResolver(validationSchema)
  })

  const handleSendMessage = (data: MessageType) => {
    axios.post(`${import.meta.env.VITE_API_BASE_URL}/manual-notification/create`, { data }, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`}})
      .then(response => {
        localStorage.setItem('token', response.data.access_token)
        toast.success('Message sent successfully')
      })
      .catch(() => {
        toast.error('Failed to send message')
      })
  }

  return (
    <div className={styles.main}>
      <div className={styles.table}>
        <h2>Messages</h2>

        <div className={styles.forms}>
          <FormProvider {...methods}>
            <form className={styles.reviewModal}>
              <InputText label='Email' name='email' id='email' placeholder="Enter the emails separated by a comma or 'all.clients@gmail.com' to send to all clients" isRequired={true} />
              <InputTextArea label='Write your message' name='message' placeholder='Write something here' isRequired={true} />
              <Button type='submit' variant='filled' fullWidth handle={methods.handleSubmit(handleSendMessage)}>Send Message</Button>
            </form>
          </FormProvider>
        </div>

        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 700 }} aria-label="customized table">
            <TableHead>
              <TableRow>
                <StyledTableCell>Sender</StyledTableCell>
                <StyledTableCell align="right">Receiver</StyledTableCell>
                <StyledTableCell align="right">Message</StyledTableCell>
                <StyledTableCell align="right">Read</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => (
                <StyledTableRow key={row.notification_id}>
                  <StyledTableCell component="th" scope="row">
                    {row.sender}
                  </StyledTableCell>
                  <StyledTableCell align="right">{row.receiver}</StyledTableCell>
                  <StyledTableCell align="right">{row.message}</StyledTableCell>
                  <StyledTableCell align="right">{<TableCheckbox sender_email={row.sender_email} receiver_email={row.receiver_email} is_read={row.is_read}/>}</StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  )
}

export default Messages
