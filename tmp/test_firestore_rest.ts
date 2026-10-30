import firebaseConfig from '../firebase-applet-config.json';

// Test converting JSON to Firestore REST API fields
export function jsonToFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (typeof value === 'number') {
      fields[key] = Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((v) => {
            if (typeof v === 'string') return { stringValue: v };
            if (typeof v === 'boolean') return { booleanValue: v };
            if (typeof v === 'number') return { integerValue: String(v) };
            return { stringValue: String(v) };
          }),
        },
      };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: { fields: jsonToFirestoreFields(value) } };
    }
  }
  return fields;
}

export function firestoreFieldsToJson(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, valObj] of Object.entries(fields)) {
    if ('stringValue' in valObj) result[key] = valObj.stringValue;
    else if ('booleanValue' in valObj) result[key] = valObj.booleanValue;
    else if ('integerValue' in valObj) result[key] = parseInt(valObj.integerValue, 10);
    else if ('doubleValue' in valObj) result[key] = valObj.doubleValue;
    else if ('nullValue' in valObj) result[key] = null;
    else if ('arrayValue' in valObj) {
      result[key] = (valObj.arrayValue.values || []).map((v: any) => {
        if ('stringValue' in v) return v.stringValue;
        if ('booleanValue' in v) return v.booleanValue;
        if ('integerValue' in v) return parseInt(v.integerValue, 10);
        return v;
      });
    } else if ('mapValue' in valObj) {
      result[key] = firestoreFieldsToJson(valObj.mapValue.fields || {});
    }
  }
  return result;
}

console.log('Converter test:');
const sample = {
  location: 'Abidjan',
  registrationsOpen: true,
  days: ['jan_1', 'jan_2'],
};
const converted = jsonToFirestoreFields(sample);
console.log('Converted:', JSON.stringify(converted));
console.log('Restored:', JSON.stringify(firestoreFieldsToJson(converted)));
