

const my_style_tab={
    borderRadius:0,
//    border:0,
    ':active':{
        bg:'app.tabSelected',
    },
    ':selected':{
        bg:'app.tabSelected',
    },
}

const input_style = {
    bg:'app.inputFilled',
    variant:'filled',
    borderRadius:0,
}

const cardItem_style_sel_tray = {
    borderRadius:'0',
    ':hover':{
        bg:'app.cardItemHover',
    },
    borderLeft: "0.7em solid",
    borderColor: "app.cardItemBorderBlue",
}

const cardItem_style_rcta = {
    borderRadius:'0',
    ':hover':{
        bg:'app.cardItemHover',
    },
    borderLeft: "0.7em solid",
    borderColor: "app.cardItemBorderGreen",
}


export {my_style_tab, input_style, cardItem_style_rcta, cardItem_style_sel_tray}
