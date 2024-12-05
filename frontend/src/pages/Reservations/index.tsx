import styles from './reservations.module.scss'
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
import SelectDropdown from 'components/SelectDropdown';
import { SingleValue, MultiValue } from 'react-select'
import { DropdownOptionType } from 'types/Component'

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

type ReservationsType = {
  field_id: number,
  field: string,
  price: string,
  price_id: number,
  time: string,
  reserved: boolean,
  waitlist: boolean
}

type FieldsType = {
  field_id: number,
  name: string,
  available: boolean,
}

type PricesType = {
  price_id: number,
  price_type: string,
  price_value: number
}

type WaitlistType = {
  waitlist_id: number,
  interested_time: string,
  silence: boolean
}

const Reservations = () => {
  const [reservations, setReservations] = useState<ReservationsType[]>([])
  const [prices, setPrices] = useState<PricesType[]>([])
  const [fields, setFields] = useState<FieldsType[]>([])
  const [selectedField, setSelectedField] = useState<DropdownOptionType | null>({ label: 'All', value: '0' });
  const [selectedDate, setSelectedDate] = useState<DropdownOptionType>({ label: new Date().toDateString(), value: new Date().toISOString().split('T')[0] });
  const [selectedTime, setSelectedTime] = useState<DropdownOptionType | null>({ label: 'All', value: '0', id: 0});
  const [waitlist, setWaitlist] = useState<WaitlistType[]>([])
  const [price_order, setPriceOrder] = useState<string>('asc')
  const [time_order,  setTimeOrder] = useState<string>('asc')


  const dataOptions = []
  for (let i = 0; i < 7; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    // push in the format label and value, being label the date and value the date in the format yyyy-mm-dd
    dataOptions.push({ label: date.toDateString(), value: date.toISOString().split('T')[0] })
  }

  // get the different times in prices to show in the dropdown
  const timeOptions = prices.map(price => {
    return { value: price.price_type.replace('FIM_SEMANA', 'FSEMANA').split('_')[1], label: price.price_type.replace('FIM_SEMANA', 'FSEMANA').split('_')[1] + ' - ' + price.price_type.replace('FIM_SEMANA', 'FSEMANA').split('_')[2], "id": price.price_id }
  })
  timeOptions.unshift({ value: '0', label: 'All', "id": 0 })

  const handleTimeFormat = (time: string, order: number) => {
    return time.replace('FIM_SEMANA', 'FSEMANA').split('_')[order]
  }

  const fieldsOptions = fields.map(field => {
    return { value: field.field_id.toString(), label: field.name }
  })
  fieldsOptions.unshift({ value: '0', label: 'All' })

  const handleSelectedField = (value: SingleValue<DropdownOptionType> | MultiValue<DropdownOptionType>) => {
    if (!value) return
    const filteredField = value as DropdownOptionType

    setSelectedField(filteredField)
  }

  const handleSelectedDate = (value: SingleValue<DropdownOptionType> | MultiValue<DropdownOptionType>) => {
    if (!value) return
    const filteredDate = value as DropdownOptionType

    // clear reservations when changing date
    setReservations([])

    setSelectedDate(filteredDate)
  }

  const handleSelectedTime = (value: SingleValue<DropdownOptionType> | MultiValue<DropdownOptionType>) => {
    if (!value) return
    const filteredTime = value as DropdownOptionType

    setSelectedTime(filteredTime)
  }

  const handleCreateReservation = (values: any) => {
    const [init_hours, init_minutes] = handleTimeFormat(values.price_time, 1).split('H');
    const initial_time = `${values.date} ${init_hours}:${init_minutes}:00`
    const [end_hours, end_minutes] = handleTimeFormat(values.price_time, 2).split('H');
    const end_time = `${values.date} ${end_hours}:${end_minutes}:00`

    const data = {
      fields_id: values.field_id,
      price_id: values.price_id,
      initial_time: initial_time,
      end_time: end_time
    }

    axios.post(`${import.meta.env.VITE_API_BASE_URL}/reservations/create`, { data: data }, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(() => {
        toast.success('Reservation created successfully')
        setTimeout(() => {
          window.location.reload()
        }
        , 1000)
      })
      .catch((response) => {
        toast.error(response.response.data.error)
      })
  }

  const handleCreateWaitlist = (time: any) => {
    // create a timestamp with the values.date and values.initial_time like '2021-10-10 10:00:00'
    const [init_hours, init_minutes] = handleTimeFormat(time, 1).split('H');
    const initial_time = `${selectedDate.value} ${init_hours}:${init_minutes}:00`

    const data = {
      silence: false,
      interested_time: initial_time
    }

    axios.post(`${import.meta.env.VITE_API_BASE_URL}/waitlist/create`, { data: data }, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(() => {
        toast.success('Waitlist created successfully')
        setTimeout(() => {
          window.location.reload()
        }
        , 1000)
      })
      .catch((response) => {
        console.log(response)
        toast.error(response.response.data.error)
      })
  }

  useEffect(() => {
    getReservations()
  }, [selectedDate, price_order, time_order, selectedField, selectedTime])

  const getReservations = () => {
    let order_filter = `?order_price=${price_order}&order_time=${time_order}&field_id=${selectedField?.value}&price_id=${selectedTime?.id}`

    axios.get(`${import.meta.env.VITE_API_BASE_URL}/reservations/date/${selectedDate?.value}${order_filter}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(response => {
        setReservations(response.data)
      })
      .catch(() => {
        toast.error('Failed to fetch reservations')
      })
  }

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/fields`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(response => {
        setFields(response.data)
      })
      .catch(() => {
        toast.error('Failed to fetch fields')
      })

    getReservations()
  }, [])

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/prices/active/${selectedDate?.value}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(response => {
        setPrices(response.data)
      })
      .catch(() => {
        toast.error('Failed to fetch prices')
      })
  }
  , [selectedDate])

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/waitlist`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(response => {
        setWaitlist(response.data)
      })
      .catch(() => {
        toast.error('Failed to fetch waitlist')
      })
  }, [])

  const handleOrderChange = (e: React.ChangeEvent<HTMLSelectElement>, type: string) => {
    if (type === 'price') {
      setPriceOrder(e.target.value)
    } else if (type === 'time') {
      setTimeOrder(e.target.value)
    }
  }

  return (
    <div className={styles.main}>
      <div className={styles.table}>
        <span>Reservations</span>

        <div>
          <SelectDropdown type='select' sendOptionsToParent={handleSelectedField} /* defaultOption={fieldsOptions[0]} */ options={fieldsOptions} label='Field' name='field' />
          <SelectDropdown type='select' sendOptionsToParent={handleSelectedDate} /* defaultOption={dataOptions[0]} */ options={dataOptions} label='Date' name='date' />
          <SelectDropdown type='select' sendOptionsToParent={handleSelectedTime} /* defaultOption={dataOptions[0]} */ options={timeOptions} label='Time' name='time' />
          <div className={styles.order_filter}>
          <span>Ordernar Hora</span> 
            <select onChange={(e) => handleOrderChange(e, "time")}>
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
            <span>Ordernar preço  </span>
            <select onChange={(e) => handleOrderChange(e, "price")}>
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </div>
        </div>

        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 700 }} aria-label="customized table">
            <TableHead>
              <TableRow>
                <StyledTableCell>Date</StyledTableCell>
                <StyledTableCell align="right">Field Name</StyledTableCell>
                <StyledTableCell align="right">Start Time</StyledTableCell>
                <StyledTableCell align="right">End Time</StyledTableCell>
                <StyledTableCell align="right">Price Value</StyledTableCell>
                <StyledTableCell align="right">Reserve</StyledTableCell>
                <StyledTableCell align="right">Waitlist</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
            {reservations?.map((row, index) => {
              return (
                <StyledTableRow key={index}>
                  <StyledTableCell align="left">{selectedDate?.label}</StyledTableCell>
                  <StyledTableCell align="right">{row.field}</StyledTableCell>
                  <StyledTableCell align="right">{handleTimeFormat(row.time, 1)}</StyledTableCell>
                  <StyledTableCell align="right">{handleTimeFormat(row.time, 2)}</StyledTableCell>
                  <StyledTableCell align="right">{row.price}</StyledTableCell>
                  <StyledTableCell align="right"><input type='checkbox' checked={row.reserved} 
                  onChange={() => handleCreateReservation({"field_id":row.field_id, "price_id": row.price_id, "price_time": row.time, "date": selectedDate.value})}></input></StyledTableCell>
                  <StyledTableCell align="right"><input type='checkbox' checked={row.waitlist}
                  onChange={() => handleCreateWaitlist(row.time)}></input></StyledTableCell>
                </StyledTableRow>
              );
            })}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  )
}

export default Reservations