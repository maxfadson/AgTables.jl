import React, { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import FilterPanel from "./tool_panel/filter_panel.jsx";
import * as util from 'util';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "ag-grid-enterprise";
import "./aggrid.css";
import { displayDateString, displayDateTimeString, displayTimeString, extractTimeInMilliseconds } from "./utils.ts";

const AgGrid = ({ table }) => {
    const [filters, setFilters] = useState(null);
    const initialWidth = localStorage.getItem(table.uuidKey);

    const columnDefs = useMemo(() => {
        let coldef = [];
        let colsFilters = { text: [], number: [], date: [] };
        let isFilters = false;
        table.columnDefs.map((column) => {
            let cols = { field: column.fieldName };
            cols.headerName = column.headerName;
            cols.initialHide = !column.visible;
            switch (column.filter) {
                case "text":
                    cols.filter = "agSetColumnFilter";
                    colsFilters.text.push({ name: column.fieldName, header: column.headerName });
                    isFilters = true;
                    break;
                case "number":
                    cols.filter = "agNumberColumnFilter";
                    colsFilters.number.push({ name: column.fieldName, formatter: column.formatter, header: column.headerName });
                    isFilters = true;
                    break;
                case "date":
                    cols.filter = "agNumberColumnFilter";
                    colsFilters.date.push({ name: column.fieldName, formatter: column.formatter, header: column.headerName });
                    isFilters = true;
                    break;
            }

            if (column.formatterType == "number") {
                cols.cellRenderer = (params) => {
                    let value = valueFormatter(
                        params,
                        column.formatter.style,
                        column.formatter.currency,
                        column.formatter.minimumFractionDigits,
                        column.formatter.maximumFractionDigits,
                        column.formatter.short,
                        column.formatter.separator
                    )

                    return cellRenderer(value, column.rectBackground, column.strFormat);
                }
            } else if (column.formatterType == "date") {
                switch (column.formatter) {
                    case "datetime":
                        cols.cellRenderer = (params) => cellRenderer(displayDateTimeString(params.value), column.rectBackground, column.strFormat);
                        break;
                    case "date":
                        cols.cellRenderer = (params) => cellRenderer(displayDateString(params.value), column.rectBackground, column.strFormat);
                        break;
                    case "time":
                        cols.cellRenderer = (params) => cellRenderer(displayTimeString(params.value), column.rectBackground, column.strFormat);
                        cols.filterValueGetter = (params) => extractTimeInMilliseconds(params.data[column.fieldName]);
                        break;
                }
            } else {
                cols.cellRenderer = (params) => cellRenderer(params.value, column.rectBackground, column.strFormat);
            }

            cols.cellStyle = (params) => {
                let style = {
                    color: column.color,
                    background: column.cellBackground,
                    justifyContent: column.textAlign
                };

                if (column.threshold)
                    style.color = params.value >= column.threshold.value ? column.threshold.colorUp : column.threshold.colorDown;

                if (column.equals.includes(params.value)) {
                    style.color = column.equalsColor;
                }

                return style;
            };

            if (table.columnFilter) colsFilters.cols = true;
            if (table.columnFilter || isFilters) setFilters(colsFilters);
            if (column.width) cols.width = column.width;
            else cols.flex = 1;
            cols.autoHeight = true;
            coldef.push(cols);
        });

        return coldef;
    }, []);

    const defaultColDef = useMemo(() => {
        return {
            editable: false,
            sortable: true,
            resizable: table.resize,
            filter: true,
            minWidth: 20,
        }
    }, []);

    const cellRenderer = (value, background, strFormat) => {
        return <div className="cell" style={{ backgroundColor: background }} dangerouslySetInnerHTML={{ __html: util.format(strFormat, value) }} />;
    }

    const sideBar = useMemo(() => {
        if (filters)
            return {
                toolPanels: [
                    {
                        id: 'customStats',
                        labelDefault: 'Custom Stats',
                        labelKey: 'customStats',
                        iconKey: 'custom-stats',
                        toolPanel: api => FilterPanel(api, filters, table.uuidKey),
                        toolPanelParams: {
                            title: 'Filters',
                            filters: filters,
                            uuidKey: table.uuidKey
                        },
                        width: parseInt(initialWidth),
                    },
                ],
                defaultToolPanel: 'customStats',
            }
    }, [filters]);

    const valueFormatter = (
        params,
        style,
        currency,
        mindigits,
        maxdigits,
        short,
        separator
    ) => {
        if (
            params.value === null ||
            params.value === NaN ||
            isNaN(Number(params.value))
        )
            return params.value;

        let settings = {};

        if (short) {
            settings["notation"] = "compact";
            settings["compactDisplay"] = "short";
        }

        settings["useGrouping"] = separator;
        settings["style"] = style;
        settings["currencyDisplay"] = "narrowSymbol";
        settings["minimumFractionDigits"] = mindigits;
        settings["maximumFractionDigits"] = maxdigits;

        if (currency) settings["currency"] = currency;

        let formatter = new Intl.NumberFormat("en-GB", settings);
        return formatter.format(Number(params.value));
    };

    return (
        <div className="ag-theme-quartz aggrid">
            <AgGridReact
                rowData={table.rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                sideBar={sideBar}
            />
        </div>
    );
};

export default AgGrid;