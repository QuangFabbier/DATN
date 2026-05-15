import { useState } from 'react'
import { SearchContext } from './SearchContext'

function SearchProvider({ children }) {
  const [searchKeyword, setSearchKeyword] = useState('')

  return (
    <SearchContext.Provider value={{ searchKeyword, setSearchKeyword }}>
      {children}
    </SearchContext.Provider>
  )
}

export default SearchProvider
