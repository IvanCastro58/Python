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

// Function to handle the search form submission (for geocoding a location)
$('#location-form').on('submit', function(e) {
    e.preventDefault();

    var location = $('#location').val();

    // Clear previous directions output
    $('#directions-output').empty();

    // Make an AJAX request to the Flask app to get geocoding data
    $.ajax({
        url: '/geocode',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ location: location }),
        success: function(response) {
            // Clear the previous marker if it exists
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }

            // Set the new marker at the searched location
            var lat = response.lat;
            var lon = response.lon;
            var address = response.address;

            currentMarker = L.marker([lat, lon]).addTo(map)
                .bindPopup(`<b>${address}</b>`)
                .openPopup();

            // Center and zoom the map on the new location
            map.setView([lat, lon], 13);
            map.fitBounds([[lat, lon]]);
        },
        error: function(xhr) {
            alert('Location not found');
        }
    });
});

// Function to handle the directions form submission
$('.transport-btn').on('click', function() {
    var startLocation = $('#start-location').val();
    var endLocation = $('#end-location').val();
    var mode = $(this).data('mode');

    // Clear previous directions output
    $('#directions-output').empty();

    // Geocode the start location
    $.ajax({
        url: '/geocode',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ location: startLocation }),
        success: function(startResponse) {
            // Set the start marker
            var startLat = startResponse.lat;
            var startLon = startResponse.lon;

            if (startMarker) {
                map.removeLayer(startMarker);
            }
            startMarker = L.marker([startLat, startLon]).addTo(map)
                .bindPopup(`<b>Start: ${startLocation}</b>`)
                .openPopup();

            // Geocode the end location
            $.ajax({
                url: '/geocode',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ location: endLocation }),
                success: function(endResponse) {
                    var endLat = endResponse.lat;
                    var endLon = endResponse.lon;

                    if (endMarker) {
                        map.removeLayer(endMarker);
                    }
                    endMarker = L.marker([endLat, endLon]).addTo(map)
                        .bindPopup(`<b>Destination: ${endLocation}</b>`)
                        .openPopup();

                    // Center the map to show both markers
                    var bounds = L.latLngBounds([startMarker.getLatLng(), endMarker.getLatLng()]);
                    map.fitBounds(bounds);

                    // Now request the directions between the two points using the selected mode
                    $.ajax({
                        url: '/directions',
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            start_location: startLocation,
                            end_location: endLocation,
                            mode: mode
                        }),
                        success: function(response) {
                            // Clear the previous polyline if it exists
                            if (currentPolyline) {
                                map.removeLayer(currentPolyline);
                            }

                            // Get and display directions
                            var steps = response.steps;
                            var distance = response.distance;
                            var duration = response.duration;

                            // Display directions steps
                            var directionsHtml = '<h5>Directions:</h5><ol>';
                            steps.forEach(function(step) {
                                directionsHtml += `<li>${step.instruction}</li>`;
                            });
                            directionsHtml += `</ol><p>Total Distance: ${(distance / 1000).toFixed(2)} km</p><p>Estimated Duration: ${(duration / 60).toFixed(2)} mins</p>`;
                            $('#directions-output').html(directionsHtml);

                            // Draw the route polyline on the map
                            var coordinates = response.geometry.coordinates.map(function(coord) {
                                return [coord[1], coord[0]];  // Flip [lon, lat] to [lat, lon]
                            });
                            currentPolyline = L.polyline(coordinates, { color: 'blue' }).addTo(map);
                            map.fitBounds(currentPolyline.getBounds());
                        },
                        error: function(xhr) {
                            alert('Could not retrieve directions');
                        }
                    });
                },
                error: function(xhr) {
                    alert('End location not found');
                }
            });
        },
        error: function(xhr) {
            alert('Start location not found');
        }
    });
});

// Document ready function to toggle between the forms
$(document).ready(function() {
    $('#search-btn').click(function() {
        $('#form-choice').hide();
        $('#search-form').show();
    });

    $('#directions-btn').click(function() {
        $('#form-choice').hide();
        $('#directions-form').show();
    });

    $('#close-search-form').on('click', function () {
        $('#search-form').hide();
        $('#form-choice').show();

        // Clear map markers when closing search form
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
    });

    $('#close-directions-form').on('click', function () {
        $('#directions-form').hide();
        $('#form-choice').show();

        // Clear directions and map markers when closing directions form
        $('#directions-output').empty();
    });
});