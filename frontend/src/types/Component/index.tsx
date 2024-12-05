import type { ReactNode } from 'react'
import type { ToastTransition } from 'react-toastify'
import type { PlaceResponseType, AddPlaceType } from 'types/Place'
import type { UserDataType } from 'types/User'

export type ButtonType = {
  children?: ReactNode,
  type?: 'button' | 'submit' | 'reset',
  handle?: () => void,
  disabled?: boolean,
  fullWidth?: boolean,
  variant?: 'filled' | 'outlined' | 'google' | 'iconOutlined' | 'iconFilled' | 'onlyIcon',
  icon?: ReactNode,
  iconPosition?: 'left' | 'middle' | 'right',
  isActive?: boolean
}

export type ToggleButtonType = {
  firstOption: string,
  secondOption: string,
  defaultOption?: string | null,
  label?: string,
  handleChange: (option: string) => void,
  disabled?: boolean,
  fullWidth?: boolean,
}

export type TabType = {
  children: ReactNode,
  handle?: () => void,
  title: string
}

export type ToastType = {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  autoClose?: number | false,
  hideProgressBar?: boolean,
  closeOnClick?: boolean,
  pauseOnHover?: boolean,
  draggable?: boolean,
  progress?: undefined | number | string,
  closeButton?: ReactNode | boolean,
  theme?: 'dark' | 'light' | 'colored',
  icon?: ReactNode | boolean,
  pauseOnFocusLoss?: boolean,
  delay?: number,
  type?: 'default' | 'success' | 'info' | 'warning' | 'error',
  transition?: ToastTransition
}

export type DropdownOptionType = {
  value: string,
  image?: string | React.ReactNode,
  label: string,
  id?: number,
  handle?: () => void
}

export type DropdownItemType = {
  data: DropdownOptionType,
  dropdownType?: 'search' | 'select',
  isSelected?: boolean,
  isMulti?: boolean
}

export type ProfileDataType = {
  name: string,
  image: string,
  user_id: string,
  tag?: string,
  value?: number
}

export type SplitBillType = {
  bill: {
    title: string,
    group_id: string,
    debtors: {
      user_id: string,
      amount: number
    }[],
    creditors: {
      user_id: string,
      amount: number
    }[],
  }
}

export type ModalBaseType = {
  isOpen: boolean,
  handleClosing: () => void
}

export type ModalEventFormType = {
  name: string,
}

export type ModalEventRequestType = {
  event: {
    group_id: string,
    name: ModalEventFormType['name'],
    user_id: string
  }
}

export type ModalAddDateType = {
  option: {
    event_id: string | null,
    date: string,
  }
}

export type VoteType = {
  vote: {
    id: string,
    votable_type: AddPlaceType | ModalAddDateType
  }
}

export type DateOptionResponseType = {
  data: {
    dateoption: DateOptionType
  }
}

export type PlaceOptionResponseType = {
  data: {
    placeoption: PlaceOptionType
  }
}

export type PlaceOptionType = {
  id: string,
  has_voted: boolean,
  place: PlaceResponseType,
  users: {
    id: string,
    image_url: string
  }[]
}

export type DateOptionType = {
  id: string,
  date: string,
  has_voted: boolean,
  users: {
    id: string,
    image_url: string
  }[]
}

export type DataType = {
  id: string,
  name: string,
  has_permission: boolean,
  places: PlaceOptionType[],
  dates: DateOptionType[]
}

export type RequestType<T> = {
  data: { [key: string]: T[] }
}

export type BillType = {
  id: string,
  title: string,
  group: {
    id: string,
    name: string
  },
  user_type: 'debtor' | 'creditor',
  debtors: Omit<UserDataType & { amount: number }, 'email' | 'image_url'>[],
  creditors: Omit<UserDataType & { amount: number }, 'email' | 'image_url'>[],
  total_amount: number,
  has_permission: boolean
}
