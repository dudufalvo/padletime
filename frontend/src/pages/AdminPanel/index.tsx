import styles from './adminpanel.module.scss'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import toast from 'utils/toast'

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

type ClientType = {
  email: string,
  first_name: string,
  last_name: string,
  phone_number: string,
  nif: string,
  role: string
}

type TableCheckboxType = {
  email: string,
  role: string
}

type ClientRequestType = {
  email: string
}

const TableCheckbox = ({ email, role }: TableCheckboxType) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const data: ClientRequestType = {
      email: email
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
    <input type='checkbox' defaultChecked={role == "admin" || role == "superadmin"} disabled={role == "superadmin"} onChange={handleChange} />
  )
}

const AdminPanel = () => {
  const [data, setData] = useState<ClientType[]>([]);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/clients`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
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

  return (
    <div className={styles.main}>
      <div className={styles.table}>
        <h2>Permissions</h2>
    
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 700 }} aria-label="customized table">
            <TableHead>
              <TableRow>
                <StyledTableCell>First Name</StyledTableCell>
                <StyledTableCell align="right">Last Name</StyledTableCell>
                <StyledTableCell align="right">Email</StyledTableCell>
                <StyledTableCell align="right">Phone Number</StyledTableCell>
                <StyledTableCell align="right">NIF</StyledTableCell>
                <StyledTableCell align="right">Admin</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => (
                <StyledTableRow key={row.nif}>
                  <StyledTableCell component="th" scope="row">
                    {row.first_name}
                  </StyledTableCell>
                  <StyledTableCell align="right">{row.last_name}</StyledTableCell>
                  <StyledTableCell align="right">{row.email}</StyledTableCell>
                  <StyledTableCell align="right">{row.phone_number}</StyledTableCell>
                  <StyledTableCell align="right">{row.nif}</StyledTableCell>
                  <StyledTableCell align="right">{<TableCheckbox email={row.email} role={row.role}/>}</StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  )
}

export default AdminPanel
