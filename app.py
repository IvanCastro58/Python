from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

# OpenRouteService API key
ORS_API_KEY = '5b3ce3597851110001cf6248cd291c98934d46739881822381683df6'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/geocode', methods=['POST'])
def geocode():
    data = request.get_json()
    location = data['location']
    
    # Geocoding request to OpenRouteService
    url = f'https://api.openrouteservice.org/geocode/search?api_key={ORS_API_KEY}&text={location}'
    response = requests.get(url)
    geocode_data = response.json()
    
    if geocode_data['features']:
        first_result = geocode_data['features'][0]['geometry']['coordinates']
        lat = first_result[1]  # Latitude
        lon = first_result[0]  # Longitude
        address = geocode_data['features'][0]['properties']['label']
        return jsonify({'lat': lat, 'lon': lon, 'address': address})
    else:
        return jsonify({'error': 'Location not found'}), 404

@app.route('/directions', methods=['POST'])
def directions():
    data = request.get_json()
    start_location = data['start_location']
    end_location = data['end_location']
    mode = data['mode']  # Get the transportation mode

    # Geocode the start and end locations to get their lat/lon coordinates
    start_coords = geocode_location(start_location)
    end_coords = geocode_location(end_location)

    if 'error' in start_coords or 'error' in end_coords:
        return jsonify({'error': 'Unable to find one or both locations.'}), 404

    # OpenRouteService directions API with selected mode
    url = f'https://api.openrouteservice.org/v2/directions/{mode}?start={start_coords["lon"]},{start_coords["lat"]}&end={end_coords["lon"]},{end_coords["lat"]}&api_key={ORS_API_KEY}'
    response = requests.get(url)
    directions_data = response.json()

    if 'features' in directions_data:
        route = directions_data['features'][0]['properties']['segments'][0]
        steps = route['steps']
        distance = route['distance']
        duration = route['duration']
        geometry = directions_data['features'][0]['geometry']

        return jsonify({
            'steps': steps,
            'distance': distance,
            'duration': duration,
            'geometry': geometry
        })
    else:
        return jsonify({'error': 'Directions not found.'}), 404


def geocode_location(location):
    """Geocode a location using the OpenRouteService API."""
    url = f'https://api.openrouteservice.org/geocode/search?api_key={ORS_API_KEY}&text={location}'
    response = requests.get(url)
    geocode_data = response.json()
    
    if geocode_data['features']:
        first_result = geocode_data['features'][0]['geometry']['coordinates']
        return {
            'lat': first_result[1],  # Latitude
            'lon': first_result[0]   # Longitude
        }
    else:
        return {'error': 'Location not found'}

if __name__ == "__main__":
    app.run(debug=True)
