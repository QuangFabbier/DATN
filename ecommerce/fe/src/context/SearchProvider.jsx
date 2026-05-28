import { useEffect, useState } from 'react'
import { SearchContext } from './SearchContext'

const SEARCH_DEBOUNCE_MS = 550

function SearchProvider({ children }) {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('')

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword)
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [searchKeyword])

  return (
    <SearchContext.Provider
      value={{
        searchKeyword,
        debouncedSearchKeyword,
        setSearchKeyword,
      }}
    >
      {children}
    </SearchContext.Provider>
  )
}

export default SearchProvider
