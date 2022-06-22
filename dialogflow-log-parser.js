const { Logging } = require('@google-cloud/logging');
const logging = new Logging({ projectId: '', keyFilename: '' });


const log = logging.log('dialogflow_agent');

async function printEntryMetadata() {
    const [entries] = await log.getEntries({
        filter: 'timestamp > "2022-06-01T23:00:00Z"',
    });
    processLogs(entries)
}
//printEntryMetadata();


const processLogs = (dirtyData) => {
    cleanLog = []
    dirtyData.forEach(dirtyEntry => {
        var dirtyEntry = dirtyEntry.metadata
        cleanEntry = {
            "ConversationTraceID": "",
            "TimeStamp": "",
            "ResponseOrRequest": "",
            "IntentId": "",
            "IntentName": "",
            "UserSaid": "",
            "Source": "",
            "SentimentScore": "",
        }
        cleanEntry['Source'] = dirtyEntry?.labels?.source || ''
        dirtyTextPayload = dirtyEntry['textPayload']
        if (dirtyTextPayload.startsWith('Dialogflow Request')) {
            cleanEntry['ResponseOrRequest'] = 'Request'
            dreqJsonString = dirtyTextPayload.split(' : ')[1]
            cleanEntry['TimeZone'] = JSON.parse(dreqJsonString)['timezone']

            dreqJson = JSON.parse(JSON.parse(dreqJsonString)['query_input'])
            if (dreqJson.hasOwnProperty('text')) {
                user_said = dreqJson['text']['textInputs'][0]['text']
                cleanEntry['UserSaid'] = user_said
            }
        }
        if (dirtyTextPayload.startsWith('Dialogflow Response')) {
            cleanEntry['ResponseOrRequest'] = "Response"
            drespTrashString = dirtyTextPayload.split(' : ')[1]
            respLines = drespTrashString.split('\n')
            respLines.forEach(respLine => {
                if (respLine.includes('resolved_query')) {
                    cleanEntry['UserSaid'] = respLine.split('"')[1]
                } else if (respLine.includes('intent_id')) {
                    cleanEntry['IntentId'] = respLine.split('"')[1]
                } else if (respLine.includes('intent_name')) {
                    cleanEntry['IntentName'] = respLine.split('"')[1]
                } else if (respLine.includes('score')) {
                    cleanEntry['SentimentScore'] = respLine.split('"')[0].split(':')[1].trim()
                    // you can define your own thresholds
                    if (cleanEntry['SentimentScore'] <= 0.3 && cleanEntry['SentimentScore'] >= -0.3)
                        cleanEntry['SentimentScore'] = 'Neutral'
                    else if (cleanEntry['SentimentScore'] >= 0.4)
                        cleanEntry['SentimentScore'] = 'Positive'
                    else if (cleanEntry['SentimentScore'] <= -0.3)
                        cleanEntry['SentimentScore'] = 'Negative'
                }
            })
            cleanEntry["TimeStamp"] = dirtyEntry['timestamp']
            cleanEntry['ConversationTraceID'] = dirtyEntry['trace']


            handoffList.forEach(({ traceID }) => {
                if (traceID == dirtyEntry['trace']) {
                    cleanEntry['Handoff'] = 'Yes'
                }
            })
        }

        cleanLog.push(cleanEntry)
    });
}












