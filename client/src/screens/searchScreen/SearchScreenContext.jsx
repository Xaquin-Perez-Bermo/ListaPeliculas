import { createContext, useContext } from 'react'
import PropTypes from 'prop-types'

const SearchScreenContext = createContext(null)

export function SearchScreenProvider({ value, children }) {
	return <SearchScreenContext.Provider value={value}>{children}</SearchScreenContext.Provider>
}

SearchScreenProvider.propTypes = {
	value: PropTypes.object.isRequired,
	children: PropTypes.node.isRequired,
}

export function useSearchScreenContext() {
	const context = useContext(SearchScreenContext)

	if (!context) {
		throw new Error('useSearchScreenContext must be used within SearchScreenProvider')
	}

	return context
}
