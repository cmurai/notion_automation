import { Client } from "@notionhq/client"

// Initializing a client
const notion = new Client({ auth: process.env.NOTION_TOKEN });

const SUBSC_DATA_SOURCE_ID = process.env.SUBSC_DATA_SOURCE_ID;
const EXPENSE_DATA_SOURCE_ID = process.env.EXPENSE_DATA_SOURCE_ID;
const HH_USD_DATA_SOURCE_ID = process.env.HH_USD_DATA_SOURCE_ID;
const HH_JPY_DATA_SOURCE_ID = process.env.HH_JPY_DATA_SOURCE_ID;

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const yyyy = tomorrow.getFullYear();
const mm = String(tomorrow.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
const dd = String(tomorrow.getDate()).padStart(2, '0');

const formattedTomorrow = `${yyyy}/${mm}/${dd}`;

async function main() {
    try {
        // filter candidates
        const response = await notion.dataSources.query({
            data_source_id: SUBSC_DATA_SOURCE_ID,
            filter: {
                "and": [
                    {
                        property: "Status",
                        status: { equals: "Active" }
                    },
                    {
                        property: "Next Payment",
                        formula: {
                            // string: { contains: "2026/08" }  // for testing
                            string: { contains: formattedTomorrow }
                        }
                    }
                ]
            }
        })

        // for each candidate, create a page in the corresponding database
        for (const item of response.results) {
            const db_type = item.properties.Household.checkbox ? "household" : "personal";
            const currency = item.properties.JPY.number === null ? "USD" : "JPY";
            const ds_id = db_type === "personal" 
                ? EXPENSE_DATA_SOURCE_ID : currency === "USD" 
                ? HH_USD_DATA_SOURCE_ID : HH_JPY_DATA_SOURCE_ID
            const expense_response = await notion.dataSources.retrieve({
                data_source_id: ds_id
            });

            // find corresponding month ID
            const month = item.properties["Next Payment"].formula.string.substring(0,7)
            const filter_month = await notion.dataSources.query({
                data_source_id: expense_response.properties.Month.relation.data_source_id,
                filter: {
                        property: "Month", 
                        rich_text: {
                            contains: month
                    }
                }
            })
            const month_id = filter_month.results[0].id

            // define json for the new page to be added
            let page_json = {
                "parent": {
                    "type": "data_source_id",
                    "data_source_id": ds_id
                }, 
                "properties": {
                    "Name": {
                        "id": "title",
                        "type": "title",
                        "title": [{
                            "type": "text",
                            "text": {
                                "content": item.properties.Name.title[0].text.content
                            }
                        }]
                    },
                    "Date": {
                        "date": {
                            "start": item.properties["Next Payment"].formula.string.replaceAll("/","-")
                        }
                    },
                    "Month": {
                        "relation": [{
                            "id": month_id
                        }]
                    }, 
                    "Category": {
                        "select": {
                            "name": item.properties.Category.select.name
                        }
                    },
                    "Account": {
                        "relation": [{
                            "id": item.properties.Account.relation[0].id
                        }]
                    }
                }
            }

            if (db_type === "household") {
                page_json.properties["Bought by"] = {
                    "select": {
                        "name": "🐱 ちえ"
                    }
                }
                page_json.properties.Price = {
                    "number": item.properties[currency].number
                }
            } else {
                page_json.properties[currency] = {
                    "number": item.properties[currency].number
                }
                page_json["template"] = {
                    type: "default"
                }
            }
            
            const creatation = await notion.pages.create(page_json);
            console.log(`Success! Entry created: ${creatation.id}`);
        }
    } catch (error) {
        console.error("Error creating Notion page:", error.body || error); 
        process.exit(1);
    }
}
main();