import { BrowserRouter, Route, Routes } from 'react-router-dom'

import SignIn from 'pages/SignIn'
import SignUp from 'pages/SignUp'
import Home from 'pages/Home'
import { PrivateRoute, NotAuthenticatedRoute } from 'utils/routes'
import { UserProvider } from './contexts/userContext'
import { Navbar } from './components/Navbar'
import { Outlet } from 'react-router-dom'
import RecoverPassword from 'pages/RecoverPassword'
import ResetPassword from 'pages/ResetPassword'
import Account from 'pages/Account'
import { Navigate } from 'react-router-dom'
import AdminPanel from 'pages/AdminPanel'
import Notifications from 'pages/Notifications'
import Reservations from 'pages/Reservations'
import Messages from 'pages/Messages'
import Statistics from 'pages/Statistics'
import Fields from 'pages/Fields'
import Prices from 'pages/Prices'
import ChangeReservations from 'pages/ChangeReservations'
import Admin from 'pages/Admin'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<NotAuthenticatedRoute />} >
          <Route path='/sign-up' element={<SignUp />} />
          <Route path='/sign-in' element={<SignIn />} />
          <Route path='/client/forgot-password' element={<RecoverPassword />} />
          <Route path='/client/reset/:token' element={<ResetPassword />} />
        </Route>
        <Route element={<PrivateRoute />} >
          <Route
              element={
                <UserProvider>
                  <Navbar />
                  <Outlet />
                </UserProvider>
              }
            >
            <Route path='*' element={<Navigate to='/' />} />
            <Route path='/' element={<Home />} />
            <Route path='/reservations' element={<Reservations />} />
            <Route path='/admin-reservations' element={<ChangeReservations />} />
            <Route path='/notifications' element={<Notifications />} />
            <Route path='/messages' element={<Messages />} />
            <Route path='/fields' element={<Fields />} />
            <Route path='/prices' element={<Prices />} />
            <Route path='/statistics' element={<Statistics />} />
            <Route path='/admin-panel' element={<AdminPanel />} />
            <Route path='/account' element={<Account />} />
            <Route path='/admin' element={<Admin />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
