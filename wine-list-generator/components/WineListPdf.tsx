'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { WineItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

// Register Fonts
Font.register({
    family: 'Noto Sans JP',
    src: 'https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8_1v4.ttf'
});

Font.register({
    family: 'Noto Serif',
    src: 'https://fonts.gstatic.com/s/notoserif/v23/ga6Iaw1J5X9T9RW6j9bNfFcWaA.ttf'
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Noto Sans JP',
        fontSize: 10,
        color: '#333'
    },
    header: {
        marginBottom: 30,
        textAlign: 'center',
        borderBottom: '1pt solid #ccc',
        paddingBottom: 10
    },
    title: {
        fontFamily: 'Noto Serif',
        fontSize: 24,
        marginBottom: 5
    },
    subtitle: {
        fontSize: 10,
        color: '#666'
    },
    section: {
        marginBottom: 20
    },
    countryHeader: {
        fontFamily: 'Noto Serif',
        fontSize: 16,
        marginBottom: 10,
        borderBottom: '1pt solid #eee',
        paddingBottom: 2,
        marginTop: 10
    },
    regionHeader: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 8,
        color: '#444',
        backgroundColor: '#f9f9f9',
        padding: 4
    },
    wineRow: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingBottom: 4,
        borderBottom: '0.5pt dashed #eee'
    },
    wineInfo: {
        flex: 1,
        paddingRight: 10
    },
    wineNameJP: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 2
    },
    wineNameOriginal: {
        fontSize: 9,
        fontFamily: 'Noto Serif',
        color: '#555',
        fontStyle: 'italic'
    },
    wineDetails: {
        fontSize: 8,
        color: '#777',
        marginTop: 2
    },
    winePrice: {
        width: 80,
        textAlign: 'right',
        fontSize: 11,
        fontFamily: 'Noto Serif'
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 8,
        color: '#999',
        borderTop: '1pt solid #eee',
        paddingTop: 10
    }
});

interface WineListPdfProps {
    items: WineItem[];
    markup: number;
}

export function WineListPdf({ items, markup }: WineListPdfProps) {
    // Group by Country -> Region -> Category
    const groupedItems = items.reduce((acc, item) => {
        const country = item.country || 'Other';
        const region = item.region || 'Other';

        if (!acc[country]) acc[country] = {};
        if (!acc[country][region]) acc[country][region] = [];

        acc[country][region].push(item);
        return acc;
    }, {} as Record<string, Record<string, WineItem[]>>);

    // Sort Countries (France, Italy first)
    const sortedCountries = Object.keys(groupedItems).sort((a, b) => {
        const priority = ['France', 'Italy', 'Spain', 'USA', 'Japan'];
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>WINE LIST</Text>
                    <Text style={styles.subtitle}>Sommelier Selection</Text>
                </View>

                {sortedCountries.map(country => (
                    <View key={country} style={styles.section}>
                        <Text style={styles.countryHeader}>{country}</Text>

                        {Object.keys(groupedItems[country]).sort().map(region => (
                            <View key={region} wrap={false}>
                                <Text style={styles.regionHeader}>{region}</Text>

                                {groupedItems[country][region]
                                    .sort((a, b) => {
                                        // Sort by Vintage Desc -> Producer -> Name
                                        if (b.vintage !== a.vintage) return b.vintage.localeCompare(a.vintage);
                                        if (a.producer !== b.producer) return a.producer.localeCompare(b.producer);
                                        return a.nameJP.localeCompare(b.nameJP);
                                    })
                                    .map(item => {
                                        const price = item.sellingPrice
                                            ? item.sellingPrice
                                            : Math.ceil((item.price * markup) / 100) * 100; // Round to 100 yen
                                        return (
                                            <View key={item.id} style={styles.wineRow}>
                                                <View style={styles.wineInfo}>
                                                    <Text style={styles.wineNameJP}>{item.nameJP || '名称未設定'}</Text>
                                                    {item.nameOriginal && <Text style={styles.wineNameOriginal}>{item.nameOriginal}</Text>}
                                                    <Text style={styles.wineDetails}>
                                                        {item.vintage ? `${item.vintage} | ` : ''}
                                                        {item.producer ? `${item.producer} | ` : ''}
                                                        {item.classification ? `${item.classification} | ` : ''}
                                                        {item.category}
                                                    </Text>
                                                </View>
                                                <View style={styles.winePrice}>
                                                    <Text>{formatCurrency(price)}</Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                            </View>
                        ))}
                    </View>
                ))}

                <View style={styles.footer}>
                    <Text>Prices include tax and service charge. / 表示価格は税・サービス料を含みます。</Text>
                </View>
            </Page>
        </Document>
    );
}
