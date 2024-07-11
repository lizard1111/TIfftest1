import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import './App.css';

function App() {
  const [globalData, setGlobalData] = useState([]);
  const [queryData, setQueryData] = useState({});
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending', useGraphOrder: false });

  useEffect(() => {
    fetch('query.csv')
      .then(response => response.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            const queryObj = {};
            results.data.forEach(row => {
              queryObj[row.acronym] = {
                graph_order: parseInt(row.graph_order),
                color_hex_triplet: row.color_hex_triplet
              };
            });
            setQueryData(queryObj);
          }
        });
      })
      .catch(error => console.error('Error loading query.csv:', error));
  }, []);

  const processData = (data, fileName) => {
    const processedData = {};
    
    data.forEach(row => {
      const acronym = row.acronym.endsWith('-L') || row.acronym.endsWith('-R') 
        ? row.acronym.slice(0, -2) 
        : row.acronym;
      
      if (!processedData[acronym]) {
        processedData[acronym] = {
          name: row.name.replace(/^(left|right) /i, ''),
          acronym: acronym,
          graph_order: queryData[acronym]?.graph_order || 0,
          [fileName]: 0
        };
      }
      
      const density = parseFloat(row['density (cells/mm^3)']) || 0;
      processedData[acronym][fileName] += density / 2;  // Average of left and right
    });

    return Object.values(processedData);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);

    Promise.all(files.map(file => 
      new Promise((resolve, reject) => {
        const fileName = file.name.replace('.csv', '');
        Papa.parse(file, {
          header: true,
          complete: (results) => resolve({ data: processData(results.data, fileName), fileName }),
          error: reject
        });
      })
    )).then(results => {
      setGlobalData(prevData => {
        const newData = [...prevData];
        results.forEach(({ data, fileName }) => {
          data.forEach(row => {
            const existingRow = newData.find(r => r.acronym === row.acronym);
            if (existingRow) {
              existingRow[fileName] = row[fileName];
            } else {
              newData.push(row);
            }
          });
        });
        return newData;
      });
    }).catch(error => {
      setError(`Error parsing CSV: ${error.message}`);
    });
  };

  const getColor = (value, min, max) => {
    const ratio = (value - min) / (max - min);
    const hue = ((1 - ratio) * 120).toString(10);
    return `hsl(${hue}, 100%, 50%)`;
  };

  const sortData = (key) => {
    let direction = 'ascending';
    let useGraphOrder = false;

    if (sortConfig.key === key) {
      if (sortConfig.direction === 'ascending') {
        direction = 'descending';
      } else if (sortConfig.direction === 'descending' && (key === 'acronym' || key === 'name')) {
        useGraphOrder = true;
      } else {
        direction = 'ascending';
      }
    }

    setSortConfig({ key, direction, useGraphOrder });
  };

  const sortedData = useMemo(() => {
    const sortableData = [...globalData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        if (sortConfig.useGraphOrder) {
          return a.graph_order - b.graph_order;
        }
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [globalData, sortConfig]);

  const columns = globalData.length > 0 ? Object.keys(globalData[0]).filter(col => col !== 'graph_order') : [];

  const densityColumns = columns.filter(col => col !== 'name' && col !== 'acronym');
  const minDensity = Math.min(...globalData.flatMap(row => densityColumns.map(col => row[col] || 0)));
  const maxDensity = Math.max(...globalData.flatMap(row => densityColumns.map(col => row[col] || 0)));

  return (
    <div className="App">
      <div id="drop_zone" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
        <p>Drag and drop CSV files here</p>
      </div>
      {error && <div className="error">{error}</div>}
      {globalData.length > 0 && (
        <div id="result">
          <table>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col} onClick={() => sortData(col)}>
                    {col}
                    {sortConfig.key === col && (
                      <span>
                        {sortConfig.useGraphOrder ? ' (GO)' : 
                         sortConfig.direction === 'ascending' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((col) => (
                    <td 
                      key={`${rowIndex}-${col}`}
                      style={{
                        backgroundColor: col !== 'name' && col !== 'acronym' ? getColor(row[col], minDensity, maxDensity) : 'white',
                        color: col !== 'name' && col !== 'acronym' ? 'black' : 'inherit'
                      }}
                    >
                      {typeof row[col] === 'number' ? row[col].toFixed(2) : row[col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;