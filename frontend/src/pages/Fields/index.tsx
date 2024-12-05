import styles from './fields.module.scss'
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
  field_id: number,
  name: string,
  available: boolean,
  type: 'remove' | 'update'
}

const TableCheckbox = ({ field_id, name, available, type }: TableCheckboxType) => {
  const handleChange = () => {
    const data = {
      field_id: field_id,
      name: name,
      available: !available
    }

    if (type === 'remove') {
      axios.delete(`${import.meta.env.VITE_API_BASE_URL}/fields/${field_id}/delete`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(() => {
          toast.success('Field removed successfully');
          setTimeout(() => {
            window.location.reload();
          }
          , 1000);
        })
        .catch(() => {
          toast.error('Failed to remove field');
        })
      return;
    }

    axios.put(`${import.meta.env.VITE_API_BASE_URL}/fields/${field_id}/update`, { data }, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(() => {
        toast.success('Field updated successfully');
      })
      .catch(() => {
        toast.error('Failed to update field');
      })
  }

  return (
    <input type='checkbox' defaultChecked={available} onChange={handleChange} />
  )
}

type FieldType = {
  name: string;
}

type TableMessageType = {
  field_id: number;
  name: string;
  available: boolean;
}

const validationSchema = yup.object().shape({
  name: yup.string().required('Field name is required'),
})

const Fields = () => {
  const [data, setData] = useState<TableMessageType[]>([]);

  const sortedData = data.sort((a, b) => a.field_id - b.field_id);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/fields`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
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

  const methods = useForm<FieldType>({
    resolver: yupResolver(validationSchema)
  })

  const handleCreateField = (dataPost: FieldType) => {
    const data = {
      name: dataPost.name,
      available: true
    }

    axios.post(`${import.meta.env.VITE_API_BASE_URL}/fields/create`, { data }, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`}})
      .then(() => {
        toast.success('Field created successfully')
        setTimeout(() => {
          window.location.reload();
        }
        , 1000);
      })
      .catch(() => {
        toast.error('Failed to create field')
      })
  }

  return (
    <div className={styles.main}>
      <div className={styles.table}>
        <h2>Fields</h2>

        <div className={styles.forms}>
          <FormProvider {...methods}>
            <form className={styles.reviewModal}>
              <InputText label='Field Name' name='name' id='name' placeholder="Enter the field name" isRequired={true} />
              <Button type='submit' variant='filled' fullWidth handle={methods.handleSubmit(handleCreateField)}>Create Field</Button>
            </form>
          </FormProvider>
        </div>

        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 700 }} aria-label="customized table">
            <TableHead>
              <TableRow>
                <StyledTableCell>Field ID</StyledTableCell>
                <StyledTableCell align="right">Name</StyledTableCell>
                <StyledTableCell align="right">Available</StyledTableCell>
                <StyledTableCell align="right">Remove</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedData?.map((row) => (
                <StyledTableRow key={row.field_id}>
                  <StyledTableCell component="th" scope="row">
                    {row.field_id}
                  </StyledTableCell>
                  <StyledTableCell align="right">{row.name}</StyledTableCell>
                  <StyledTableCell align="right">{<TableCheckbox field_id={row.field_id} name={row.name} available={row.available} type='update'/>}</StyledTableCell>
                  <StyledTableCell align="right">{<TableCheckbox field_id={row.field_id} name={row.name} available={false} type='remove'/>}</StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  )
}

export default Fields
