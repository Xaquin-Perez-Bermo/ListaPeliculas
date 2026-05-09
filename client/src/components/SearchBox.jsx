import React from 'react'

const SearchBox = ({ value, setSearchValue, placeholder = 'Buscar...' }) => (
  <div className="search-box">
    <input
      className="search-input"
      type="text"
      value={value}
      onChange={(event) => setSearchValue(event.target.value)}
      placeholder={placeholder}
    />
  </div>
)

export default SearchBox
