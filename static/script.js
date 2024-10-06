// Initialize the map
var map = L.map('map').setView([51.505, -0.09], 13);

// Add a tile layer to the map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Variables to store the markers and polyline
var currentMarker = null;
var currentPolyline = null;
var startMarker = null;
var endMarker = null;

$('#location-form').on('submit', function(e) {
    e.preventDefault();
    
    var location = $('#location').val();

    // Clear previous directions output
    $('#directions-output').empty();

    // Show loading spinner
    $('#loading').show();

    // Make an AJAX request to the Flask app to get geocoding data
    $.ajax({
        url: '/geocode',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ location: location }),
        success: function(response) {
            var lat = response.lat;
            var lon = response.lon;

            // Remove existing marker if any
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }

            // Hide loading spinner
            $('#loading').hide();

            // Add a marker at the searched location
            currentMarker = L.marker([lat, lon]).addTo(map)
                .bindPopup(`<b>${response.address}</b><br>Lat: ${lat}, Lon: ${lon}`)
                .openPopup();
            
            map.setView([lat, lon], 13);
        },
        error: function(xhr, status, error) {
            console.error('Error:', error);
            alert('Unable to find location.');
            $('#loading').hide();
        }
    });
});

$('.transport-btn').on('click', function() {
    var mode = $(this).data('mode');
    var startLocation = $('#start-location').val();
    var endLocation = $('#end-location').val();

    // Show loading spinner
    $('#loading-direction').show();

    // Make an AJAX request to the Flask app to get directions
    $.ajax({
        url: '/directions',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ start_location: startLocation, end_location: endLocation, mode: mode }),
        success: function(response) {
            // Clear the previous polyline if it exists
            if (currentPolyline) {
                map.removeLayer(currentPolyline);
            }

            // Clear the previous markers if they exist
            if (startMarker) {
                map.removeLayer(startMarker);
            }
            if (endMarker) {
                map.removeLayer(endMarker);
            }

            // Get and display directions
            var steps = response.steps;
            var distance = response.distance;
            var duration = response.duration;
            var geometry = response.geometry;  // The polyline geometry

            // Hide loading spinner
            $('#loading-direction').hide();

            // Display directions steps
            var directionsHtml = '<h5>Directions:</h5><ol>';
            steps.forEach(function(step) {
                directionsHtml += `<li>${step.instruction}</li>`;
            });
            directionsHtml += `</ol><p>Total Distance: ${(distance / 1000).toFixed(2)} km</p><p>Estimated Duration: ${(duration / 60).toFixed(2)} mins</p>`;
            $('#directions-output').html(directionsHtml);

            // Draw the route polyline on the map
            var coordinates = geometry.coordinates.map(function(coord) {
                return [coord[1], coord[0]];  // Flip [lon, lat] to [lat, lon]
            });
            currentPolyline = L.polyline(coordinates, { color: 'blue' }).addTo(map);
            map.fitBounds(currentPolyline.getBounds());

            // Add markers for start and end locations
            startMarker = L.marker([coordinates[0][0], coordinates[0][1]]).addTo(map)
                .bindPopup('Start: ' + startLocation).openPopup();
            endMarker = L.marker([coordinates[coordinates.length - 1][0], coordinates[coordinates.length - 1][1]]).addTo(map)
                .bindPopup('End: ' + endLocation).openPopup();
        },
        error: function(xhr, status, error) {
            console.error('Error:', error);
            alert('Unable to get directions.');
            $('#loading-direction').hide();
        }
    });
});

// Handle UI display for search and directions forms
$('#search-btn').on('click', function() {
    $('#form-choice').hide();
    $('#search-form').show();
});

$('#directions-btn').on('click', function() {
    $('#form-choice').hide();
    $('#directions-form').show();
});

$('#close-search-form').on('click', function() {
    $('#search-form').hide();
    $('#form-choice').show();
});

$('#close-directions-form').on('click', function() {
    $('#directions-form').hide();
    $('#form-choice').show();
});
