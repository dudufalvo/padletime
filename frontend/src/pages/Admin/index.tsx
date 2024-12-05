import styles from './admin.module.scss'

import Tabs from 'components/Tab'
import AdminPanel from 'pages/AdminPanel'
import Messages from 'pages/Messages'
import Fields from 'pages/Fields'
import Prices from 'pages/Prices'
import ChangeReservations from 'pages/ChangeReservations'
import Statistics from 'pages/Statistics'
import { useUser } from 'contexts/userContext'

const Admin = () => {
  const { user } = useUser()

  return (
    <>
      <div className={styles.accountOptions}>
        <div className={styles.accountOptionsContent}>
          <h1>Admin Panel</h1>
        </div>
        <Tabs
          tabs={
            user?.role === 'superadmin' ? [
              { title: 'Messages', children: <Messages /> },
              { title: 'Fields', children: <Fields /> },
              { title: 'Prices', children: <Prices /> },
              { title: 'Change Reservations', children: <ChangeReservations /> },
              { title: 'Statistics', children: <Statistics /> },
              { title: 'Permissions', children: <AdminPanel /> }
            ] :
            [
            { title: 'Messages', children: <Messages /> },
            { title: 'Fields', children: <Fields /> },
            { title: 'Prices', children: <Prices /> },
            { title: 'Change Reservations', children: <ChangeReservations /> },
            { title: 'Statistics', children: <Statistics /> }
          ]} />
      </div>
    </>
  )
}

export default Admin
