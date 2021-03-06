import React, {useRef, useState} from 'react';
import L from 'leaflet';
import Helmet from 'react-helmet';

import Layout from 'components/Layout';
import Map from 'components/Map';
import axios from 'axios';
import _ from 'lodash';

const LOCATION = {
	lat: 0,
	lng: 0
};
const CENTER = [LOCATION.lat, LOCATION.lng];
const DEFAULT_ZOOM = 2;
let geoJsonLayers = {};

export const TotalsContext = React.createContext(null);


export const updateMap = (geoJsonLayersData, map) => {
	if (!_.isEmpty(geoJsonLayers)) {
		geoJsonLayers.clearLayers();
	}
	geoJsonLayers = geoJsonLayersData;
	geoJsonLayers.addTo(map);
};

const IndexPage = () => {
	/**
	 * mapEffect
	 * @description Fires a callback once the page renders
	 * @example Here this is and example of being used to zoom in and set a popup on load
	 */

	const [totals, setTotals] = useState({});
	const [countries, setCountries] = useState({});

	async function mapEffect({leafletElement: map} = {}) {
		let countriesResponse, totalsResponse;

		try {
			[countriesResponse, totalsResponse] = await Promise.all([
				axios.get('https://corona.lmao.ninja/v2/countries'),
				axios.get('https://corona.lmao.ninja/v2/all')
			]);
		} catch (e) {
			console.log(`Failed to fetch: ${e.message}`, e);
			return;
		}

		const {data: countriesData = []} = countriesResponse;
		const {data: totalsData = {}} = totalsResponse;
		setTotals(totalsData);
		setCountries(countriesData);

		const hasData = Array.isArray(countriesData) && countriesData.length > 0;

		if (!hasData) return;

		const geoJson = {
			type: 'FeatureCollection',
			features: countriesData.map((country = {}) => {
				const {countryInfo = {}} = country;
				const {lat, long: lng} = countryInfo;
				return {
					type: 'Feature',
					properties: {
						...country
					},
					geometry: {
						type: 'Point',
						coordinates: [lng, lat]
					}
				}
			})
		}

		const geoJsonLayers = new L.GeoJSON(geoJson, {
			pointToLayer: (feature = {}, latlng) => {
				const {properties = {}} = feature;
				let updatedFormatted;
				let casesString;

				const {
					country,
					updated,
					cases,
					deaths,
					recovered
				} = properties

				casesString = `${cases}`;

				if (cases > 1000) {
					casesString = `${casesString.slice(0, -3)}k+`
				}

				if (updated) {
					updatedFormatted = new Date(updated).toLocaleString();
				}

				const html = `
      <span class='icon-marker'>
				<span class="icon-marker-tooltip icon-marker-tooltip-${country}">
          <h2>${country}</h2>
          <ul>
            <li><strong>Confirmed:</strong> ${cases}</li>
            <li><strong>Deaths:</strong> ${deaths}</li>
            <li><strong>Recovered:</strong> ${recovered}</li>
            <li><strong>Last Update:</strong> ${updatedFormatted}</li>
          </ul>
        </span>
        ${casesString}
      </span>
    `;

				const marker =  L.marker(latlng, {
					icon: L.divIcon({
						className: 'icon',
						html
					}),
					riseOnHover: true
				});
				marker.on("click", function(e) {
					const elem = document.getElementsByClassName(
						`icon-marker-tooltip-${country}`
					)[0];
					const arr = elem.className.split(" ");
					if (arr.indexOf(`mobile-active`) == -1) {
						elem.className += " mobile-active";
					}
				});

				return marker;
			}
		});
		updateMap(geoJsonLayers, map);
	}

	const mapSettings = {
		center: CENTER,
		defaultBaseMap: 'OpenStreetMap',
		zoom: DEFAULT_ZOOM,
		mapEffect
	};

	return (
		<TotalsContext.Provider value={{totals, countries}}>
			<Layout pageName="Corona Virus Map">
				<Helmet>
					<title>Corona Virus Map</title>
				</Helmet>
				<Map {...mapSettings} />
			</Layout>
		</TotalsContext.Provider>
	);
};

export default IndexPage;
