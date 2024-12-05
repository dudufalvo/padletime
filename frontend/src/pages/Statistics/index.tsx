import styles from './statistics.module.scss'
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
import { ChangeEvent, useEffect, useState } from 'react'
import SelectDropdown from 'components/SelectDropdown';
import { DropdownOptionType } from 'types/Component';
import { SingleValue, MultiValue } from 'react-select';

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

type TableType = {
  count: number,
  label: string
}

type TableSimpleType = {
  label: string
}

type WaitlistType = {
  counter: number,
  datetime: string,
}

type ReservationAuditType = {
  id: number,
  field: string,
  old_value: string,
  new_value: string,
  change_date: string,
  reservation_id: boolean
}

const Statistics = () => {
  const [reservedField, setReservedField] = useState<TableType[]>([])
  const [reservedTime, setReservedTime] = useState<TableType[]>([])
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>('1week')
  const [selectedFilterType, setSelectedFilterType] = useState<string>('day')
  const [selectedFilter, setSelectedFilter] = useState<string>('null')
  const [unusedFields, setUnusedFields] = useState<TableSimpleType[]>([]);
  const [unusedTimes, setUnusedTimes] = useState<TableSimpleType[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistType[]>([])
  const [reservationAudit, setReservationAudit] = useState<ReservationAuditType[]>([])

  const handleSelectedOption = (value: SingleValue<DropdownOptionType> | MultiValue<DropdownOptionType>) => {
    if (!value) return
    const filteredOption = value as DropdownOptionType

    setSelectedTimePeriod(filteredOption.value)
  }

  const handleSelectedFilterType = (value: ChangeEvent<HTMLSelectElement>) => {
    if (!value) return
    const filteredOption = value as ChangeEvent<HTMLSelectElement>
    
    setSelectedFilterType(filteredOption.target.value)
  }

  const handleSelectedFilter = (value: ChangeEvent<HTMLInputElement>) => {
    if (!value) return
    const filteredOption = value as ChangeEvent<HTMLInputElement>
    
    setSelectedFilter(filteredOption.target.value)
  }

  const renderFilter = (selectedFilterType: string) => {
    if(selectedFilterType === 'day') {
      return(
        <input type="date" onChange={handleSelectedFilter}/> 
      )
    } else if(selectedFilterType === 'month') {
      return(
        <input type="month" onChange={handleSelectedFilter}/>  
      )
    }
    else {
      return(
        <input type="number" onChange={handleSelectedFilter}/> 
      )
    }
  }

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/statistics/frequent-field/${selectedTimePeriod}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((response) => {
        setReservedField([response.data])
      })
      .catch(err => {
        toast.error(err.response.data.message)
      })

    axios.get(`${import.meta.env.VITE_API_BASE_URL}/statistics/frequent-time/${selectedTimePeriod}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((response) => {
        setReservedTime([response.data])
      })
      .catch(err => {
        toast.error(err.response.data.message)
      })

    axios.get(`${import.meta.env.VITE_API_BASE_URL}/statistics/waitlist/more-requests`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(res => {
        setWaitlist(res.data)
      })
      .catch(err => {
        toast.error(err.response.data.message)
      })

  }, [selectedTimePeriod])

  useEffect(() => {
    if (selectedFilter === 'null') return

    axios.get(`${import.meta.env.VITE_API_BASE_URL}/statistics/fields-unused/${selectedFilterType}/${selectedFilter}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then((response) => {
      setUnusedFields(response.data)
    })
    .catch(() => {
      toast.error('Error fetching reserved field statistics')
    })

    axios.get(`${import.meta.env.VITE_API_BASE_URL}/statistics/time-unused/${selectedFilterType}/${selectedFilter}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then((response) => {
      setUnusedTimes(response.data)
    })
    .catch(() => {
      toast.error('Error fetching reserved field statistics')
    })

    axios.get(`${import.meta.env.VITE_API_BASE_URL}/statistics/reservations-audit/${selectedFilterType}/${selectedFilter}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then((response) => {
      setReservationAudit(response.data)
    })
    .catch(() => {
      toast.error('Error fetching audit field statistics')
    })
  }, [selectedFilter])

  
  return (
    <div className={styles.main}>
      <div className={styles.table}>
        <h2>Statistics</h2>
        <SelectDropdown type='select' label='Select Time Period' options={[{ value: '1week', label: '1 Week' }, { value: '1month', label: '1 Month' }, { value: '1year', label: '1 Year' }]} sendOptionsToParent={handleSelectedOption} />
        <div>
          <span>Most Reserved Field</span>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 700 }} aria-label="customized table">
              <TableHead>
                <TableRow>
                  <StyledTableCell>Count</StyledTableCell>
                  <StyledTableCell align="right">Field</StyledTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservedField?.map((row) => (
                  <StyledTableRow key={row.count}>
                    <StyledTableCell component="th" scope="row">
                      {row.count}
                    </StyledTableCell>
                    <StyledTableCell align="right">{row.label}</StyledTableCell>
                  </StyledTableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>

        <div>
          <span>Most Reserved Time</span>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 700 }} aria-label="customized table">
              <TableHead>
                <TableRow>
                  <StyledTableCell>Count</StyledTableCell>
                  <StyledTableCell align="right">Time</StyledTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservedTime?.map((row) => (
                  <StyledTableRow key={row.count}>
                    <StyledTableCell component="th" scope="row">
                      {row.count}
                    </StyledTableCell>
                    <StyledTableCell align="right">{row.label}</StyledTableCell>
                  </StyledTableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>

        <div>
          <span>Waitlist</span>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 700 }} aria-label="customized table">
              <TableHead>
                <TableRow>
                  <StyledTableCell align="left">Count</StyledTableCell>
                  <StyledTableCell align="right">Day & Hour</StyledTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {waitlist?.map((row, index) => (
                  <StyledTableRow key={index}>
                    <StyledTableCell align="left">{row.counter}</StyledTableCell>
                    <StyledTableCell align="right">{row.datetime}</StyledTableCell>
                  </StyledTableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>

        <div className={styles.specificStatisticsFilterDiv}>
          <select onChange={handleSelectedFilterType}>
            <option value="day">Day</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
          {renderFilter(selectedFilterType)}
        </div>

        <div>
          <span>Unused Fields</span>
          { unusedFields.length >= 0 &&
                      <TableContainer component={Paper}>
                      <Table sx={{ minWidth: 700 }} aria-label="customized table">
                        <TableHead>
                          <TableRow>
                            <StyledTableCell>Field</StyledTableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {unusedFields.map((row) => (
                            <StyledTableRow key={row.label}>
                              <StyledTableCell align="left">{row.label}</StyledTableCell>
                            </StyledTableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
          }
        </div>
        <div>
          <span>Unused Times</span>
          { unusedTimes.length >= 0 &&
                      <TableContainer component={Paper}>
                      <Table sx={{ minWidth: 700 }} aria-label="customized table">
                        <TableHead>
                          <TableRow>
                            <StyledTableCell>Times</StyledTableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {unusedTimes.map((row) => (
                            <StyledTableRow key={row.label}>
                              <StyledTableCell align="left">{row.label}</StyledTableCell>
                            </StyledTableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
          }
        </div>

        <div>
          <span>Reservations Audit</span>
          { reservationAudit.length >= 0 &&
                      <TableContainer component={Paper}>
                      <Table sx={{ minWidth: 700 }} aria-label="customized table">
                        <TableHead>
                          <TableRow>
                            <StyledTableCell>Reservation Audit ID</StyledTableCell>
                            <StyledTableCell align="right">Field</StyledTableCell>
                            <StyledTableCell align="right">Old Value</StyledTableCell>
                            <StyledTableCell align="right">New Value</StyledTableCell>
                            <StyledTableCell align="right">Change Date</StyledTableCell>
                            <StyledTableCell align="right">Reservation ID</StyledTableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reservationAudit?.map((row) => (
                            <StyledTableRow key={row.id}>
                              <StyledTableCell component="th" scope="row">
                                {row.id}
                              </StyledTableCell>
                              <StyledTableCell align="right">{row.field}</StyledTableCell>
                              <StyledTableCell align="right">{row.old_value}</StyledTableCell>
                              <StyledTableCell align="right">{row.new_value}</StyledTableCell>
                              <StyledTableCell align="right">{row.change_date}</StyledTableCell>
                              <StyledTableCell align="right">{row.reservation_id}</StyledTableCell>
                            </StyledTableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
          }
        </div>

      </div>
    </div>
  )
}

export default Statistics
