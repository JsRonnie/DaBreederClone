import React from 'react'

export default function MyDogs({ dogs = [], onAddDog }) {
  // Sample data for demonstration if no dogs are provided
  const sampleDogs = [
    {
      id: 1,
      name: "Buddy",
      breed: "Golden Retriever",
      age: "3 years",
      sex: "Male",
      image: "/heroPup.jpg"
    },
    {
      id: 2,
      name: "Luna",
      breed: "German Shepherd",
      age: "2 years",
      sex: "Female",
      image: "/shibaPor.jpg"
    },
    {
      id: 3,
      name: "Max",
      breed: "Labrador",
      age: "4 years",
      sex: "Male",
      image: "/heroPup.jpg"
    },
    {
      id: 4,
      name: "Bella",
      breed: "Shiba Inu",
      age: "1 year",
      sex: "Female",
      image: "/shibaPor.jpg"
    }
  ]

  const displayDogs = dogs.length > 0 ? dogs : sampleDogs

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with title and add button */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Dogs</h1>
          <button 
            onClick={onAddDog}
            className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-2 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Pet
          </button>
        </div>
        {displayDogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No dogs yet</h3>
            <p className="text-gray-500 mb-6">Add your first dog to get started with breeding matches.</p>
            <button 
              onClick={onAddDog}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
            >
              Add Your First Dog
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {displayDogs.map((dog) => (
              <div 
                key={dog.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                {/* Dog Photo */}
                <div className="h-48 bg-gray-200 overflow-hidden">
                  <img 
                    src={dog.image} 
                    alt={dog.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDEzMCA3MEwxNzAgMTEwTDE3MCAyMDBIMzBMMzAgMTEwTDcwIDcwTDEwMCAxMDBaIiBmaWxsPSIjRTVFN0VCIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMjAiIGZpbGw9IiNEMUQ1REIiLz4KPHN2Zz4K'
                    }}
                  />
                </div>
                
                {/* Dog Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{dog.name}</h3>
                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <p>{dog.breed}</p>
                    <p>{dog.age} • {dog.sex}</p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors duration-200">
                      View Profile
                    </button>
                    <button className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors duration-200">
                      Find Match
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}